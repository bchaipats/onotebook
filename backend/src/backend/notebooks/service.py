import json
import re

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.llm import get_provider
from src.backend.llm.base import ChatMessage as LLMChatMessage
from src.backend.models import Chunk, Document, Notebook, utc_now
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


async def create_notebook(session: AsyncSession, data: NotebookCreate) -> tuple[Notebook, int]:
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


async def generate_notebook_summary(
    session: AsyncSession,
    notebook: Notebook,
    provider_name: str | None = None,
    model: str | None = None,
) -> Notebook:
    """Generate a summary for a notebook based on its sources."""
    provider_name = provider_name or notebook.llm_provider
    model = model or notebook.llm_model

    # Get content snippets from documents
    stmt = (
        select(Document)
        .where(Document.notebook_id == notebook.id)
        .where(Document.processing_status == "ready")
    )
    result = await session.execute(stmt)
    documents = list(result.scalars().all())

    snippets = [f"[{doc.filename}]: {doc.summary[:500]}" for doc in documents if doc.summary]

    # If not enough summaries, get chunk content
    if len(snippets) < 5:
        stmt = (
            select(Chunk)
            .join(Document, Chunk.document_id == Document.id)
            .where(Document.notebook_id == notebook.id)
            .where(Document.processing_status == "ready")
            .order_by(Chunk.chunk_index)
            .limit(20)
        )
        result = await session.execute(stmt)
        chunks = list(result.scalars().all())
        snippets.extend(chunk.content[:500] for chunk in chunks)

    snippets = snippets[:20]

    if not snippets:
        notebook.summary = None
        notebook.summary_key_terms = None
        notebook.summary_generated_at = utc_now()
        await session.commit()
        await session.refresh(notebook)
        return notebook

    provider = get_provider(provider_name)

    context = "\n\n---\n\n".join(snippets)
    prompt = f"""Based on the following content from multiple sources, create a comprehensive summary of the notebook's contents. Also identify 5-10 key terms or concepts that are central to the material.

Source content:
{context}

Respond with a JSON object in this exact format:
{{
  "summary": "A 2-3 paragraph summary of all the sources, highlighting the main topics, themes, and key insights...",
  "key_terms": ["term1", "term2", "term3", ...]
}}

Only return the JSON object, nothing else."""

    messages = [LLMChatMessage(role="user", content=prompt)]

    try:
        full_response = ""
        async for chunk in provider.chat_stream(messages, model):
            if chunk:
                full_response += chunk

        # Parse JSON response
        json_match = re.search(r"\{.*\}", full_response, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            notebook.summary = data.get("summary", "")
            key_terms = data.get("key_terms", [])
            notebook.summary_key_terms = json.dumps(key_terms)
        else:
            # Fallback: use the response as summary
            notebook.summary = full_response.strip()
            notebook.summary_key_terms = json.dumps([])

        notebook.summary_generated_at = utc_now()
        await session.commit()
        await session.refresh(notebook)
        return notebook

    except Exception:
        # On error, mark as attempted but failed
        notebook.summary = None
        notebook.summary_key_terms = None
        notebook.summary_generated_at = utc_now()
        await session.commit()
        await session.refresh(notebook)
        return notebook
