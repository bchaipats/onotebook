from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.database import get_session
from src.backend.notebooks.service import get_notebook
from src.backend.notes import service
from src.backend.notes.schemas import (
    NoteCreate,
    NoteListResponse,
    NoteResponse,
    NoteUpdate,
)

router = APIRouter(prefix="/api", tags=["notes"])


@router.get("/notebooks/{notebook_id}/notes", response_model=NoteListResponse)
async def list_notes(
    notebook_id: str,
    session: AsyncSession = Depends(get_session),
) -> NoteListResponse:
    """List all notes in a notebook."""
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    notes = await service.list_notes(session, notebook_id)
    return NoteListResponse(notes=[NoteResponse.model_validate(n) for n in notes])


@router.post(
    "/notebooks/{notebook_id}/notes",
    response_model=NoteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_note(
    notebook_id: str,
    data: NoteCreate,
    session: AsyncSession = Depends(get_session),
) -> NoteResponse:
    """Create a new note."""
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    note = await service.create_note(
        session,
        notebook_id,
        content=data.content,
        title=data.title,
        source_message_id=data.source_message_id,
    )
    return NoteResponse.model_validate(note)


@router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    session: AsyncSession = Depends(get_session),
) -> NoteResponse:
    """Get a note by ID."""
    note = await service.get_note(session, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    return NoteResponse.model_validate(note)


@router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    data: NoteUpdate,
    session: AsyncSession = Depends(get_session),
) -> NoteResponse:
    """Update a note."""
    note = await service.get_note(session, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    updated = await service.update_note(
        session,
        note,
        title=data.title,
        content=data.content,
    )
    return NoteResponse.model_validate(updated)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a note."""
    note = await service.get_note(session, note_id)
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found",
        )
    await service.delete_note(session, note)
