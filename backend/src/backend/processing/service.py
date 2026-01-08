"""Document processing service."""

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.embedding.service import embed_texts
from src.backend.embedding.vectorstore import add_chunks_to_collection
from src.backend.models import Chunk, Document
from src.backend.processing.chunking import chunk_text
from src.backend.processing.extractors import extract_text


async def update_document_status(
    session: AsyncSession,
    document: Document,
    status: str,
    error: str | None = None,
    progress: int | None = None,
) -> None:
    """Update document processing status."""
    document.processing_status = status
    document.processing_error = error
    if progress is not None:
        document.processing_progress = progress
    await session.commit()
    await session.refresh(document)


async def process_document(session: AsyncSession, document: Document) -> None:
    """Process a document: extract text, chunk, embed, and store."""
    try:
        # Update status to processing (0% progress)
        await update_document_status(session, document, "processing", progress=0)

        # Extract text (0-33% progress)
        file_path = Path(document.file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        result = extract_text(file_path, document.file_type)
        await update_document_status(session, document, "processing", progress=33)

        # Update page count if available
        if result.page_count is not None:
            document.page_count = result.page_count

        # Chunk text (33-66% progress)
        chunks_data = chunk_text(result.text)
        await update_document_status(session, document, "processing", progress=66)

        if not chunks_data:
            document.chunk_count = 0
            document.processing_status = "ready"
            document.processing_progress = 100
            document.processing_error = None
            await session.commit()
            return

        # Create chunk records
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

        # Flush to get chunk IDs
        await session.flush()

        # Generate embeddings
        texts = [c.content for c in chunks_data]
        embeddings = embed_texts(texts)

        # Update chunks with embedding info
        for chunk, embedding in zip(chunk_records, embeddings):
            chunk.embedding_id = chunk.id  # Use chunk ID as embedding ID

        # Store in ChromaDB
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

        # Update document (100% progress)
        document.chunk_count = len(chunks_data)
        document.processing_status = "ready"
        document.processing_progress = 100
        document.processing_error = None
        await session.commit()

    except Exception as e:
        await session.rollback()
        await update_document_status(session, document, "failed", str(e))
        raise
