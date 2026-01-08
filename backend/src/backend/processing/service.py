"""Document processing service."""

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.models import Chunk, Document
from src.backend.processing.chunking import chunk_text
from src.backend.processing.extractors import extract_text


async def update_document_status(
    session: AsyncSession,
    document: Document,
    status: str,
    error: str | None = None,
) -> None:
    """Update document processing status."""
    document.processing_status = status
    document.processing_error = error
    await session.commit()
    await session.refresh(document)


async def process_document(session: AsyncSession, document: Document) -> None:
    """Process a document: extract text, chunk, and store."""
    try:
        # Update status to processing
        await update_document_status(session, document, "processing")

        # Extract text
        file_path = Path(document.file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        result = extract_text(file_path, document.file_type)

        # Update page count if available
        if result.page_count is not None:
            document.page_count = result.page_count

        # Chunk text
        chunks = chunk_text(result.text)

        # Store chunks
        for index, chunk_data in enumerate(chunks):
            chunk = Chunk(
                document_id=document.id,
                chunk_index=index,
                content=chunk_data.content,
                token_count=chunk_data.token_count,
            )
            session.add(chunk)

        # Update document
        document.chunk_count = len(chunks)
        document.processing_status = "ready"
        document.processing_error = None
        await session.commit()

    except Exception as e:
        await session.rollback()
        await update_document_status(session, document, "failed", str(e))
        raise
