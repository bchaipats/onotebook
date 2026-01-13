"""Sources API router."""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.config import settings
from src.backend.database import get_session
from src.backend.documents.schemas import DocumentResponse
from src.backend.models import Document, Notebook
from src.backend.sources.extractors.search import search_web
from src.backend.sources.extractors.url import extract_url_content
from src.backend.sources.extractors.youtube import extract_youtube_content
from src.backend.sources.schemas import (
    AddSearchResultsRequest,
    CreatePasteSource,
    CreateSourceRequest,
    CreateUrlSource,
    CreateYouTubeSource,
    SearchResultItem,
    SourceContentResponse,
    SourceGuideResponse,
    WebSearchRequest,
    WebSearchResponse,
)
from src.backend.sources.service import (
    check_source_limit,
    create_paste_source,
    create_source_from_extraction,
    get_source_content,
    get_source_count,
    process_non_file_source,
)

router = APIRouter(prefix="/api", tags=["sources"])


async def get_notebook_or_404(session: AsyncSession, notebook_id: str) -> Notebook:
    """Get notebook by ID or raise 404."""
    result = await session.execute(select(Notebook).where(Notebook.id == notebook_id))
    notebook = result.scalar_one_or_none()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    return notebook


async def get_document_or_404(session: AsyncSession, document_id: str) -> Document:
    """Get document by ID or raise 404."""
    result = await session.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


async def process_source_background(
    document_id: str,
    content: str,
) -> None:
    """Background task to process a non-file source."""
    from src.backend.database import async_session

    async with async_session() as session:
        result = await session.execute(select(Document).where(Document.id == document_id))
        document = result.scalar_one_or_none()
        if document:
            await process_non_file_source(session, document, content)


@router.post("/notebooks/{notebook_id}/sources", response_model=DocumentResponse, status_code=201)
async def create_source(
    notebook_id: str,
    request: CreateSourceRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> Document:
    """Create a new source (URL, YouTube, or pasted text)."""
    await get_notebook_or_404(session, notebook_id)

    try:
        if isinstance(request, CreateUrlSource):
            extraction = await extract_url_content(str(request.url))
            document = await create_source_from_extraction(session, notebook_id, extraction, "url")
            background_tasks.add_task(process_source_background, document.id, extraction.content)

        elif isinstance(request, CreateYouTubeSource):
            extraction = await extract_youtube_content(str(request.url))
            document = await create_source_from_extraction(
                session, notebook_id, extraction, "youtube"
            )
            background_tasks.add_task(process_source_background, document.id, extraction.content)

        elif isinstance(request, CreatePasteSource):
            document = await create_paste_source(
                session, notebook_id, request.title, request.content
            )
            background_tasks.add_task(process_source_background, document.id, request.content)

        else:
            raise HTTPException(status_code=400, detail="Invalid source type")

        return document

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create source: {str(e)}") from e


@router.post("/notebooks/{notebook_id}/sources/search", response_model=WebSearchResponse)
async def search_sources(
    notebook_id: str,
    request: WebSearchRequest,
    session: AsyncSession = Depends(get_session),
) -> WebSearchResponse:
    """Search the web for potential sources."""
    await get_notebook_or_404(session, notebook_id)

    if not settings.tavily_api_key:
        raise HTTPException(
            status_code=503,
            detail="Web search is not configured. Set TAVILY_API_KEY environment variable.",
        )

    try:
        results = await search_web(request.query, request.mode)
        return WebSearchResponse(
            results=[
                SearchResultItem(
                    id=r.id,
                    title=r.title,
                    url=r.url,
                    snippet=r.snippet,
                    favicon_url=r.favicon_url,
                )
                for r in results
            ],
            query=request.query,
            mode=request.mode,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}") from e


@router.post(
    "/notebooks/{notebook_id}/sources/from-search",
    response_model=list[DocumentResponse],
    status_code=201,
)
async def add_sources_from_search(
    notebook_id: str,
    request: AddSearchResultsRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> list[Document]:
    """Add multiple URLs as sources from search results."""
    await get_notebook_or_404(session, notebook_id)

    documents = []
    errors = []

    for url in request.urls:
        try:
            await check_source_limit(session, notebook_id)
            extraction = await extract_url_content(str(url))
            document = await create_source_from_extraction(session, notebook_id, extraction, "url")
            background_tasks.add_task(process_source_background, document.id, extraction.content)
            documents.append(document)
        except ValueError as e:
            errors.append(f"{url}: {str(e)}")
        except Exception as e:
            errors.append(f"{url}: Failed to add - {str(e)}")

    if not documents and errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))

    return documents


@router.get("/documents/{document_id}/guide", response_model=SourceGuideResponse)
async def get_source_guide(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> SourceGuideResponse:
    """Get the source guide (AI summary) for a document."""
    import json

    document = await get_document_or_404(session, document_id)

    topics = None
    if document.summary_topics:
        try:
            topics = json.loads(document.summary_topics)
        except json.JSONDecodeError:
            topics = None

    return SourceGuideResponse(
        document_id=document.id,
        summary=document.summary,
        topics=topics,
        generated_at=document.summary_generated_at,
    )


@router.post("/documents/{document_id}/guide/generate", response_model=SourceGuideResponse)
async def generate_guide(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> SourceGuideResponse:
    """Generate or regenerate the source guide for a document."""
    document = await get_document_or_404(session, document_id)

    if document.processing_status != "ready":
        raise HTTPException(
            status_code=400,
            detail="Document must be fully processed before generating a guide",
        )

    try:
        from src.backend.sources.service import generate_source_guide

        summary, topics = await generate_source_guide(session, document)

        return SourceGuideResponse(
            document_id=document.id,
            summary=summary,
            topics=topics if topics else None,
            generated_at=document.summary_generated_at,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate guide: {e}") from e


@router.get("/documents/{document_id}/content", response_model=SourceContentResponse)
async def get_document_content(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> SourceContentResponse:
    """Get the full extracted content of a document."""
    document = await get_document_or_404(session, document_id)

    content = await get_source_content(session, document_id)

    return SourceContentResponse(
        document_id=document.id,
        content=content,
        chunk_count=document.chunk_count,
    )


@router.get("/notebooks/{notebook_id}/sources/count")
async def get_notebook_source_count(
    notebook_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get the current source count and limit for a notebook."""
    await get_notebook_or_404(session, notebook_id)

    count = await get_source_count(session, notebook_id)

    return {
        "count": count,
        "limit": settings.max_sources_per_notebook,
        "remaining": settings.max_sources_per_notebook - count,
    }
