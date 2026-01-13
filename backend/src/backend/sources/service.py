"""Sources service for creating and managing different source types."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.config import settings
from src.backend.embedding.service import embed_texts
from src.backend.embedding.vectorstore import add_chunks_to_collection
from src.backend.models import Chunk, Document, utc_now
from src.backend.processing.chunking import chunk_text
from src.backend.processing.service import update_document_status
from src.backend.sources.extractors.url import ExtractionResult


async def get_source_count(session: AsyncSession, notebook_id: str) -> int:
    """Get current number of sources in a notebook."""
    result = await session.execute(
        select(func.count(Document.id)).where(Document.notebook_id == notebook_id)
    )
    return result.scalar() or 0


async def check_source_limit(session: AsyncSession, notebook_id: str) -> None:
    """Check if notebook has reached source limit."""
    count = await get_source_count(session, notebook_id)
    if count >= settings.max_sources_per_notebook:
        raise ValueError(
            f"Notebook has reached the maximum of {settings.max_sources_per_notebook} sources"
        )


async def create_source_from_extraction(
    session: AsyncSession,
    notebook_id: str,
    extraction: ExtractionResult,
    source_type: str,
) -> Document:
    """Create a document from already-extracted content."""
    await check_source_limit(session, notebook_id)

    document = Document(
        notebook_id=notebook_id,
        filename=extraction.title,
        file_type=source_type,
        source_type=source_type,
        source_url=extraction.source_url,
        file_size=extraction.content_size,
        file_path="",
        processing_status="pending",
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)

    return document


async def create_paste_source(
    session: AsyncSession,
    notebook_id: str,
    title: str,
    content: str,
) -> Document:
    """Create a source from pasted text."""
    await check_source_limit(session, notebook_id)

    if not content.strip():
        raise ValueError("Content cannot be empty")

    content_size = len(content.encode("utf-8"))
    if content_size > 500_000:
        raise ValueError("Content exceeds maximum size of 500KB")

    document = Document(
        notebook_id=notebook_id,
        filename=title.strip() if title.strip() else "Pasted Text",
        file_type="paste",
        source_type="paste",
        file_size=content_size,
        file_path="",
        processing_status="pending",
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)

    return document


async def get_source_content(session: AsyncSession, document_id: str) -> str:
    """Get the full content of a source from its chunks."""
    result = await session.execute(
        select(Chunk).where(Chunk.document_id == document_id).order_by(Chunk.chunk_index)
    )
    chunks = result.scalars().all()

    if not chunks:
        return ""

    return "\n\n".join(chunk.content for chunk in chunks)


async def process_non_file_source(
    session: AsyncSession,
    document: Document,
    content: str,
) -> None:
    """Process a non-file source (URL, YouTube, paste) through the chunking pipeline."""
    try:
        await update_document_status(session, document, "processing", progress=33)

        chunks_data = chunk_text(content)
        await update_document_status(session, document, "processing", progress=66)

        if not chunks_data:
            document.chunk_count = 0
            document.processing_status = "ready"
            document.processing_progress = 100
            document.processing_error = None
            await session.commit()
            return

        chunk_records: list[Chunk] = []
        for index, chunk_data in enumerate(chunks_data):
            chunk = Chunk(
                document_id=document.id,
                chunk_index=index,
                content=chunk_data.content,
                token_count=chunk_data.token_count,
            )
            session.add(chunk)
            chunk_records.append(chunk)

        await session.flush()

        texts = [c.content for c in chunks_data]
        embeddings = embed_texts(texts)

        for chunk, _ in zip(chunk_records, embeddings, strict=True):
            chunk.embedding_id = chunk.id

        add_chunks_to_collection(
            notebook_id=document.notebook_id,
            chunk_ids=[c.id for c in chunk_records],
            embeddings=embeddings,
            documents=texts,
            metadatas=[
                {
                    "document_id": document.id,
                    "document_name": document.filename,
                    "chunk_index": c.chunk_index,
                    "token_count": c.token_count,
                }
                for c in chunk_records
            ],
        )

        document.chunk_count = len(chunks_data)
        document.processing_status = "ready"
        document.processing_progress = 100
        document.processing_error = None
        await session.commit()

    except Exception as e:
        await session.rollback()
        await update_document_status(session, document, "failed", str(e))
        raise


async def generate_source_guide(session: AsyncSession, document: Document) -> tuple[str, list[str]]:
    """Generate AI summary and topics for a document using Ollama."""
    import json

    import httpx

    result = await session.execute(
        select(Chunk)
        .where(Chunk.document_id == document.id)
        .order_by(Chunk.chunk_index)
        .limit(settings.source_guide_max_chunks)
    )
    chunks = result.scalars().all()

    if not chunks:
        raise ValueError("Document has no content to summarize")

    context = "\n\n".join(chunk.content for chunk in chunks)
    if len(context) > 12000:
        context = context[:12000] + "\n\n[Content truncated...]"

    prompt = f"""Analyze this document and provide:
1. A concise summary (2-3 paragraphs) with key topics in **bold**
2. A list of 3-5 key topic phrases (short, 2-4 words each)

You MUST respond in this exact JSON format:
{{"summary": "Your summary here with **bold** terms...", "topics": ["Topic 1", "Topic 2", "Topic 3"]}}

Document content:
{context}"""

    response_parts = []
    async with (
        httpx.AsyncClient(timeout=float(settings.ollama_timeout)) as client,
        client.stream(
            "POST",
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.default_llm_model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": True,
            },
        ) as response,
    ):
        async for line in response.aiter_lines():
            if line:
                chunk = json.loads(line)
                if "message" in chunk and "content" in chunk["message"]:
                    response_parts.append(chunk["message"]["content"])

    raw_response = "".join(response_parts).strip()

    # Parse JSON response
    try:
        # Find JSON in response (handle markdown code blocks)
        json_str = raw_response
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0]
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0]

        parsed = json.loads(json_str.strip())
        summary = parsed.get("summary", raw_response)
        topics = parsed.get("topics", [])
        if not isinstance(topics, list):
            topics = []
        topics = [str(t) for t in topics[:5]]
    except (json.JSONDecodeError, IndexError):
        summary = raw_response
        topics = []

    document.summary = summary
    document.summary_topics = json.dumps(topics) if topics else None
    document.summary_generated_at = utc_now()
    await session.commit()
    await session.refresh(document)

    return summary, topics
