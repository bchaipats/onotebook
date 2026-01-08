from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.database import get_session
from src.backend.documents import service
from src.backend.documents.schemas import (
    ChunkListResponse,
    ChunkResponse,
    DocumentListResponse,
    DocumentResponse,
)
from src.backend.notebooks.service import get_notebook

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
        processing_error=doc.processing_error,
        created_at=doc.created_at,
    )


@router.get(
    "/notebooks/{notebook_id}/documents", response_model=DocumentListResponse
)
async def list_documents(
    notebook_id: str,
    session: AsyncSession = Depends(get_session),
) -> DocumentListResponse:
    """List all documents in a notebook."""
    # Verify notebook exists
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    documents = await service.list_documents(session, notebook_id)
    return DocumentListResponse(
        documents=[document_to_response(doc) for doc in documents]
    )


@router.post(
    "/notebooks/{notebook_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    notebook_id: str,
    file: UploadFile,
    session: AsyncSession = Depends(get_session),
) -> DocumentResponse:
    """Upload a document to a notebook."""
    # Verify notebook exists
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    try:
        document = await service.upload_document(session, notebook_id, file)
        return document_to_response(document)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


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
