import json
import re
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.llm import get_provider
from src.backend.llm.base import ChatMessage as LLMChatMessage
from src.backend.models import Chunk, Document, Notebook, StudioOutput


async def get_mindmap(session: AsyncSession, notebook_id: str) -> StudioOutput | None:
    stmt = (
        select(StudioOutput)
        .where(StudioOutput.notebook_id == notebook_id)
        .where(StudioOutput.output_type == "mindmap")
        .order_by(StudioOutput.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_mindmap_task(session: AsyncSession, notebook: Notebook) -> StudioOutput:
    """Create a pending mindmap task for background generation."""
    output = StudioOutput(
        notebook_id=notebook.id,
        output_type="mindmap",
        title=f"Mind Map: {notebook.name}",
        data=json.dumps({"central_topic": notebook.name, "nodes": []}),
        generation_status="pending",
        generation_progress=0,
    )
    session.add(output)
    await session.commit()
    await session.refresh(output)
    return output


async def get_task_by_id(session: AsyncSession, task_id: str) -> StudioOutput | None:
    """Get a studio output by ID."""
    stmt = select(StudioOutput).where(StudioOutput.id == task_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def _update_task_status(
    session: AsyncSession,
    task: StudioOutput,
    status: str,
    progress: int,
    error: str | None = None,
    data: dict | None = None,
) -> None:
    """Update task status and progress."""
    task.generation_status = status
    task.generation_progress = progress
    task.generation_error = error
    if data is not None:
        task.data = json.dumps(data)
    await session.commit()


async def generate_mindmap_background(
    task_id: str,
    notebook_id: str,
    notebook_name: str,
    provider_name: str,
    model: str,
) -> None:
    """Background task to generate mindmap. Opens its own database session."""
    from src.backend.database import async_session

    async with async_session() as session:
        task = await get_task_by_id(session, task_id)
        if not task or task.generation_status != "pending":
            return

        await _update_task_status(session, task, "processing", 10)

        try:
            # Collect content snippets from documents
            stmt = (
                select(Document)
                .where(Document.notebook_id == notebook_id)
                .where(Document.processing_status == "ready")
            )
            result = await session.execute(stmt)
            documents = list(result.scalars().all())

            snippets = [
                f"[{doc.filename}]: {doc.summary[:500]}" for doc in documents if doc.summary
            ]

            await _update_task_status(session, task, "processing", 20)

            if len(snippets) < 5:
                stmt = (
                    select(Chunk)
                    .join(Document, Chunk.document_id == Document.id)
                    .where(Document.notebook_id == notebook_id)
                    .where(Document.processing_status == "ready")
                    .order_by(Chunk.chunk_index)
                    .limit(30)
                )
                result = await session.execute(stmt)
                chunks = list(result.scalars().all())
                snippets.extend(chunk.content[:400] for chunk in chunks)

            snippets = snippets[:30]

            await _update_task_status(session, task, "processing", 33)

            if not snippets:
                await _update_task_status(
                    session, task, "ready", 100, data={"central_topic": notebook_name, "nodes": []}
                )
                return

            context = "\n\n---\n\n".join(snippets)
            prompt = f"""Analyze the following content and create a hierarchical mind map structure. The mind map should have:
1. A central topic that captures the main theme
2. 3-6 main branches representing major topics/themes
3. Each main branch can have 2-4 sub-branches with more specific concepts

Content to analyze:
{context}

Respond with a JSON object in this exact format:
{{
  "central_topic": "Main Topic",
  "nodes": [
    {{
      "id": "unique-id-1",
      "label": "Main Branch 1",
      "children": [
        {{"id": "unique-id-1-1", "label": "Sub-topic 1", "children": []}},
        {{"id": "unique-id-1-2", "label": "Sub-topic 2", "children": []}}
      ]
    }},
    {{
      "id": "unique-id-2",
      "label": "Main Branch 2",
      "children": []
    }}
  ]
}}

Generate unique IDs for each node. Only return the JSON object, nothing else."""

            await _update_task_status(session, task, "processing", 50)

            provider = get_provider(provider_name)
            full_response = ""
            async for chunk in provider.chat_stream(
                [LLMChatMessage(role="user", content=prompt)], model
            ):
                if chunk:
                    full_response += chunk

            await _update_task_status(session, task, "processing", 80)

            json_match = re.search(r"\{.*\}", full_response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                _ensure_node_ids(data)
            else:
                data = {
                    "central_topic": notebook_name,
                    "nodes": [{"id": str(uuid4()), "label": "Topics", "children": []}],
                }

            await _update_task_status(session, task, "ready", 100, data=data)

        except Exception as e:
            await _update_task_status(
                session,
                task,
                "failed",
                0,
                error=str(e),
                data={"central_topic": notebook_name, "nodes": []},
            )


def _ensure_node_ids(data: dict) -> None:
    for node in data.get("nodes", []):
        _ensure_node_id(node)


def _ensure_node_id(node: dict) -> None:
    if not node.get("id"):
        node["id"] = str(uuid4())
    for child in node.get("children", []):
        _ensure_node_id(child)
