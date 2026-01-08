import os
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.config import settings
from src.backend.models import Chunk, Document


ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx", ".html"}
EXTENSION_TO_TYPE = {
    ".pdf": "pdf",
    ".txt": "txt",
    ".md": "markdown",
    ".docx": "docx",
    ".html": "html",
}


def get_file_extension(filename: str) -> str:
    """Get the lowercase file extension."""
    return Path(filename).suffix.lower()


def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return get_file_extension(filename) in ALLOWED_EXTENSIONS


async def list_documents(
    session: AsyncSession, notebook_id: str
) -> list[Document]:
    """List all documents in a notebook."""
    stmt = (
        select(Document)
        .where(Document.notebook_id == notebook_id)
        .order_by(Document.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_document(session: AsyncSession, document_id: str) -> Document | None:
    """Get a document by ID."""
    stmt = select(Document).where(Document.id == document_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_document_chunks(
    session: AsyncSession, document_id: str
) -> list[Chunk]:
    """Get all chunks for a document."""
    stmt = (
        select(Chunk)
        .where(Chunk.document_id == document_id)
        .order_by(Chunk.chunk_index)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def upload_document(
    session: AsyncSession, notebook_id: str, file: UploadFile
) -> Document:
    """Upload a document to a notebook."""
    if not file.filename:
        raise ValueError("File must have a filename")

    extension = get_file_extension(file.filename)
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type {extension} not allowed")

    # Generate unique file path
    file_id = str(uuid4())
    file_dir = Path(settings.upload_directory) / notebook_id
    file_dir.mkdir(parents=True, exist_ok=True)
    file_path = file_dir / f"{file_id}{extension}"

    # Save file
    content = await file.read()
    file_size = len(content)

    if file_size > settings.max_upload_size_bytes:
        raise ValueError(
            f"File too large. Maximum size is {settings.max_upload_size_mb}MB"
        )

    with open(file_path, "wb") as f:
        f.write(content)

    # Create document record
    document = Document(
        notebook_id=notebook_id,
        filename=file.filename,
        file_type=EXTENSION_TO_TYPE[extension],
        file_size=file_size,
        file_path=str(file_path),
        processing_status="pending",
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return document


async def delete_document(session: AsyncSession, document: Document) -> None:
    """Delete a document and its file."""
    # Delete file if it exists
    file_path = Path(document.file_path)
    if file_path.exists():
        file_path.unlink()

    # Delete document record (cascades to chunks)
    await session.delete(document)
    await session.commit()
