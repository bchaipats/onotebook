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
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def _save_mindmap(
    session: AsyncSession, notebook_id: str, name: str, data: dict
) -> StudioOutput:
    output = StudioOutput(
        notebook_id=notebook_id,
        output_type="mindmap",
        title=f"Mind Map: {name}",
        data=json.dumps(data),
    )
    session.add(output)
    await session.commit()
    await session.refresh(output)
    return output


async def generate_mindmap(
    session: AsyncSession,
    notebook: Notebook,
    provider_name: str | None = None,
    model: str | None = None,
) -> StudioOutput:
    provider_name = provider_name or notebook.llm_provider
    model = model or notebook.llm_model

    # Collect content snippets from documents
    stmt = (
        select(Document)
        .where(Document.notebook_id == notebook.id)
        .where(Document.processing_status == "ready")
    )
    result = await session.execute(stmt)
    documents = list(result.scalars().all())

    snippets = [f"[{doc.filename}]: {doc.summary[:500]}" for doc in documents if doc.summary]

    if len(snippets) < 5:
        stmt = (
            select(Chunk)
            .join(Document, Chunk.document_id == Document.id)
            .where(Document.notebook_id == notebook.id)
            .where(Document.processing_status == "ready")
            .order_by(Chunk.chunk_index)
            .limit(30)
        )
        result = await session.execute(stmt)
        chunks = list(result.scalars().all())
        snippets.extend(chunk.content[:400] for chunk in chunks)

    snippets = snippets[:30]

    if not snippets:
        return await _save_mindmap(
            session, notebook.id, notebook.name, {"central_topic": notebook.name, "nodes": []}
        )

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

    try:
        provider = get_provider(provider_name)
        full_response = ""
        async for chunk in provider.chat_stream(
            [LLMChatMessage(role="user", content=prompt)], model
        ):
            if chunk:
                full_response += chunk

        json_match = re.search(r"\{.*\}", full_response, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            _ensure_node_ids(data)
        else:
            data = {
                "central_topic": notebook.name,
                "nodes": [{"id": str(uuid4()), "label": "Topics", "children": []}],
            }

        return await _save_mindmap(session, notebook.id, notebook.name, data)

    except Exception:
        return await _save_mindmap(
            session, notebook.id, notebook.name, {"central_topic": notebook.name, "nodes": []}
        )


def _ensure_node_ids(data: dict) -> None:
    for node in data.get("nodes", []):
        _ensure_node_id(node)


def _ensure_node_id(node: dict) -> None:
    if not node.get("id"):
        node["id"] = str(uuid4())
    for child in node.get("children", []):
        _ensure_node_id(child)
