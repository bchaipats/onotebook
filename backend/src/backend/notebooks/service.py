from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.models import Document, Notebook, utc_now
from src.backend.notebooks.schemas import NotebookCreate, NotebookUpdate


async def list_notebooks(session: AsyncSession) -> list[tuple[Notebook, int]]:
    """List all notebooks with their document counts."""
    stmt = (
        select(Notebook, func.count(Document.id).label("document_count"))
        .outerjoin(Document, Notebook.id == Document.notebook_id)
        .group_by(Notebook.id)
        .order_by(Notebook.updated_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.all())


async def get_notebook(session: AsyncSession, notebook_id: str) -> Notebook | None:
    """Get a notebook by ID."""
    stmt = select(Notebook).where(Notebook.id == notebook_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_notebook_with_document_count(
    session: AsyncSession, notebook_id: str
) -> tuple[Notebook, int] | None:
    """Get a notebook by ID with document count."""
    stmt = (
        select(Notebook, func.count(Document.id).label("document_count"))
        .outerjoin(Document, Notebook.id == Document.notebook_id)
        .where(Notebook.id == notebook_id)
        .group_by(Notebook.id)
    )
    result = await session.execute(stmt)
    row = result.one_or_none()
    return row if row else None


async def create_notebook(
    session: AsyncSession, data: NotebookCreate
) -> tuple[Notebook, int]:
    """Create a new notebook."""
    notebook = Notebook(
        name=data.name,
        description=data.description,
        color=data.color,
    )
    session.add(notebook)
    await session.commit()
    await session.refresh(notebook)
    return notebook, 0


async def update_notebook(
    session: AsyncSession, notebook: Notebook, data: NotebookUpdate
) -> Notebook:
    """Update an existing notebook."""
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(notebook, key, value)
    notebook.updated_at = utc_now()
    await session.commit()
    await session.refresh(notebook)
    return notebook


async def delete_notebook(session: AsyncSession, notebook: Notebook) -> None:
    """Delete a notebook and all its related data."""
    await session.delete(notebook)
    await session.commit()
