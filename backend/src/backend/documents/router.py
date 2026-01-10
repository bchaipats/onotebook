from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.database import async_session, get_session
from src.backend.documents import service
from src.backend.documents.schemas import (
    ChunkListResponse,
    ChunkResponse,
    DocumentListResponse,
    DocumentResponse,
    SearchRequest,
    SearchResponse,
    SearchResult,
)
from src.backend.embedding.service import embed_query
from src.backend.embedding.vectorstore import search_collection
from src.backend.notebooks.service import get_notebook
from src.backend.processing.service import process_document

router = APIRouter(prefix="/api", tags=["documents"])


def document_to_response(doc: service.Document) -> DocumentResponse:
    """Convert document model to response."""
    return DocumentResponse(
        id=doc.id,
        notebook_id=doc.notebook_id,
        filename=doc.filename,
        file_type=doc.file_type,
        file_size=doc.file_size,
        page_count=doc.page_count,
        chunk_count=doc.chunk_count,
        processing_status=doc.processing_status,
        processing_progress=doc.processing_progress,
        processing_error=doc.processing_error,
        created_at=doc.created_at,
        source_type=doc.source_type,
        source_url=doc.source_url,
        summary=doc.summary,
    )


async def process_document_background(document_id: str) -> None:
    """Process document in background with new session."""
    async with async_session() as session:
        document = await service.get_document(session, document_id)
        if document and document.processing_status == "pending":
            await process_document(session, document)


@router.get("/notebooks/{notebook_id}/documents", response_model=DocumentListResponse)
async def list_documents(
    notebook_id: str,
    session: AsyncSession = Depends(get_session),
) -> DocumentListResponse:
    """List all documents in a notebook."""
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    documents = await service.list_documents(session, notebook_id)
    return DocumentListResponse(documents=[document_to_response(doc) for doc in documents])


@router.post(
    "/notebooks/{notebook_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    notebook_id: str,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> DocumentResponse:
    """Upload a document to a notebook."""
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    try:
        document = await service.upload_document(session, notebook_id, file)
        # Queue background processing
        background_tasks.add_task(process_document_background, document.id)
        return document_to_response(document)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> DocumentResponse:
    """Get a document by ID."""
    document = await service.get_document(session, document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return document_to_response(document)


@router.get("/documents/{document_id}/file")
async def get_document_file(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> FileResponse:
    """Get the original file for a document."""
    document = await service.get_document(session, document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk",
        )

    # Determine media type based on file type
    media_types = {
        "pdf": "application/pdf",
        "txt": "text/plain",
        "markdown": "text/markdown",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "html": "text/html",
    }
    media_type = media_types.get(document.file_type, "application/octet-stream")

    return FileResponse(
        path=file_path,
        filename=document.filename,
        media_type=media_type,
    )


@router.get("/documents/{document_id}/chunks", response_model=ChunkListResponse)
async def get_document_chunks(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> ChunkListResponse:
    """Get all chunks for a document."""
    document = await service.get_document(session, document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    chunks = await service.get_document_chunks(session, document_id)
    return ChunkListResponse(
        chunks=[
            ChunkResponse(
                id=chunk.id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                token_count=chunk.token_count,
                page_number=chunk.page_number,
            )
            for chunk in chunks
        ]
    )


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a document."""
    document = await service.get_document(session, document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    await service.delete_document(session, document)


@router.post("/documents/{document_id}/process", response_model=DocumentResponse)
async def reprocess_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> DocumentResponse:
    """Retry processing a failed document."""
    document = await service.get_document(session, document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Reset status to pending and clear error
    document.processing_status = "pending"
    document.processing_error = None
    await session.commit()
    await session.refresh(document)

    # Queue background processing
    background_tasks.add_task(process_document_background, document.id)
    return document_to_response(document)


@router.post("/notebooks/{notebook_id}/search", response_model=SearchResponse)
async def search_documents(
    notebook_id: str,
    request: SearchRequest,
    session: AsyncSession = Depends(get_session),
) -> SearchResponse:
    """Search for relevant chunks in a notebook."""
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    # Embed query
    query_embedding = embed_query(request.query)

    # Search vector store
    results = search_collection(
        notebook_id=notebook_id,
        query_embedding=query_embedding,
        n_results=request.top_k,
    )

    # Convert to response format
    search_results: list[SearchResult] = []

    if results and results.get("ids") and results["ids"][0]:
        ids = results["ids"][0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for i, chunk_id in enumerate(ids):
            metadata = metadatas[i] if i < len(metadatas) else {}
            content = documents[i] if i < len(documents) else ""
            distance = distances[i] if i < len(distances) else 1.0

            # Convert distance to relevance score (cosine distance to similarity)
            relevance_score = 1.0 - distance

            search_results.append(
                SearchResult(
                    chunk_id=chunk_id,
                    document_id=metadata.get("document_id", ""),
                    document_name=metadata.get("document_name", ""),
                    content=content,
                    chunk_index=metadata.get("chunk_index", 0),
                    token_count=metadata.get("token_count", 0),
                    relevance_score=round(relevance_score, 4),
                )
            )

    return SearchResponse(results=search_results)
