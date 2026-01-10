from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.models import Note, utc_now


async def list_notes(session: AsyncSession, notebook_id: str) -> list[Note]:
    """List all notes in a notebook."""
    stmt = select(Note).where(Note.notebook_id == notebook_id).order_by(Note.updated_at.desc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_note(session: AsyncSession, note_id: str) -> Note | None:
    """Get a note by ID."""
    stmt = select(Note).where(Note.id == note_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_note(
    session: AsyncSession,
    notebook_id: str,
    content: str,
    title: str | None = None,
    source_message_id: str | None = None,
) -> Note:
    """Create a new note."""
    note = Note(
        notebook_id=notebook_id,
        title=title,
        content=content,
        source_message_id=source_message_id,
    )
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return note


async def update_note(
    session: AsyncSession,
    note: Note,
    title: str | None = None,
    content: str | None = None,
) -> Note:
    """Update a note."""
    if title is not None:
        note.title = title
    if content is not None:
        note.content = content
    note.updated_at = utc_now()
    await session.commit()
    await session.refresh(note)
    return note


async def delete_note(session: AsyncSession, note: Note) -> None:
    """Delete a note."""
    await session.delete(note)
    await session.commit()
