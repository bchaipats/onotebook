from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.database import get_session
from src.backend.notebooks import service
from src.backend.notebooks.schemas import (
    NotebookCreate,
    NotebookListResponse,
    NotebookResponse,
    NotebookUpdate,
)

router = APIRouter(prefix="/api/notebooks", tags=["notebooks"])


def notebook_to_response(notebook: tuple) -> NotebookResponse:
    """Convert notebook tuple to response model."""
    nb, doc_count = notebook
    return NotebookResponse(
        id=nb.id,
        name=nb.name,
        description=nb.description,
        color=nb.color,
        document_count=doc_count,
        created_at=nb.created_at,
        updated_at=nb.updated_at,
    )


@router.get("", response_model=NotebookListResponse)
async def list_notebooks(
    session: AsyncSession = Depends(get_session),
) -> NotebookListResponse:
    """List all notebooks."""
    notebooks = await service.list_notebooks(session)
    return NotebookListResponse(
        notebooks=[notebook_to_response(nb) for nb in notebooks]
    )


@router.post("", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED)
async def create_notebook(
    data: NotebookCreate,
    session: AsyncSession = Depends(get_session),
) -> NotebookResponse:
    """Create a new notebook."""
    notebook = await service.create_notebook(session, data)
    return notebook_to_response(notebook)


@router.get("/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(
    notebook_id: str,
    session: AsyncSession = Depends(get_session),
) -> NotebookResponse:
    """Get a notebook by ID."""
    result = await service.get_notebook_with_document_count(session, notebook_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    return notebook_to_response(result)


@router.put("/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(
    notebook_id: str,
    data: NotebookUpdate,
    session: AsyncSession = Depends(get_session),
) -> NotebookResponse:
    """Update a notebook."""
    notebook = await service.get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    updated = await service.update_notebook(session, notebook, data)
    # Get document count
    result = await service.get_notebook_with_document_count(session, notebook_id)
    if result:
        return notebook_to_response(result)
    return NotebookResponse(
        id=updated.id,
        name=updated.name,
        description=updated.description,
        color=updated.color,
        document_count=0,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(
    notebook_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a notebook and all its related data."""
    notebook = await service.get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    await service.delete_notebook(session, notebook)
