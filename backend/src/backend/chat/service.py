"""Chat service for session and message management."""

import json
import re
from collections.abc import AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.chat.schemas import GroundingMetadata
from src.backend.config import settings
from src.backend.database import async_session
from src.backend.embedding.service import embed_query
from src.backend.embedding.vectorstore import search_collection
from src.backend.llm import get_provider
from src.backend.llm.base import ChatMessage as LLMChatMessage
from src.backend.models import ChatSession, Message, MessageSource, Notebook, utc_now


async def list_sessions(session: AsyncSession, notebook_id: str) -> list[ChatSession]:
    """List all chat sessions in a notebook."""
    stmt = (
        select(ChatSession)
        .where(ChatSession.notebook_id == notebook_id)
        .order_by(ChatSession.updated_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_session(session: AsyncSession, session_id: str) -> ChatSession | None:
    """Get a chat session by ID."""
    stmt = select(ChatSession).where(ChatSession.id == session_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_session(
    session: AsyncSession, notebook_id: str, title: str | None = None
) -> ChatSession:
    """Create a new chat session."""
    chat_session = ChatSession(
        notebook_id=notebook_id,
        title=title,
    )
    session.add(chat_session)
    await session.commit()
    await session.refresh(chat_session)
    return chat_session


async def update_session_title(
    session: AsyncSession, chat_session: ChatSession, title: str
) -> ChatSession:
    """Update a chat session title."""
    chat_session.title = title
    chat_session.updated_at = utc_now()
    await session.commit()
    await session.refresh(chat_session)
    return chat_session


async def delete_session(session: AsyncSession, chat_session: ChatSession) -> None:
    """Delete a chat session and all its messages."""
    await session.delete(chat_session)
    await session.commit()


async def get_messages(session: AsyncSession, session_id: str) -> list[Message]:
    """Get all messages in a chat session."""
    stmt = select(Message).where(Message.chat_session_id == session_id).order_by(Message.created_at)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_message(session: AsyncSession, message_id: str) -> Message | None:
    """Get a message by ID."""
    stmt = select(Message).where(Message.id == message_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_message(
    session: AsyncSession,
    chat_session_id: str,
    role: str,
    content: str,
    model: str | None = None,
) -> Message:
    """Create a new message."""
    message = Message(
        chat_session_id=chat_session_id,
        role=role,
        content=content,
        model=model,
    )
    session.add(message)
    await session.commit()
    await session.refresh(message)
    return message


async def add_message_source(
    session: AsyncSession,
    message_id: str,
    chunk_id: str,
    relevance_score: float,
    citation_index: int,
) -> MessageSource:
    """Add a source citation to a message."""
    source = MessageSource(
        message_id=message_id,
        chunk_id=chunk_id,
        relevance_score=relevance_score,
        citation_index=citation_index,
    )
    session.add(source)
    await session.commit()
    return source


async def get_message_sources(session: AsyncSession, message_id: str) -> list[MessageSource]:
    """Get all sources for a message."""
    stmt = (
        select(MessageSource)
        .where(MessageSource.message_id == message_id)
        .order_by(MessageSource.citation_index)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def delete_last_assistant_message(
    session: AsyncSession, chat_session_id: str
) -> Message | None:
    """Delete the last assistant message in a session (for regeneration)."""
    stmt = (
        select(Message)
        .where(Message.chat_session_id == chat_session_id)
        .where(Message.role == "assistant")
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    message = result.scalar_one_or_none()
    if message:
        await session.delete(message)
        await session.commit()
    return message


async def delete_messages_after(
    session: AsyncSession, message: Message
) -> int:
    """Delete all messages that come after the specified message in the session."""
    from sqlalchemy import delete

    stmt = (
        delete(Message)
        .where(Message.chat_session_id == message.chat_session_id)
        .where(Message.created_at > message.created_at)
    )
    result = await session.execute(stmt)
    await session.commit()
    return result.rowcount or 0


def generate_title_from_message(content: str) -> str:
    """Generate a session title from the first message."""
    title = content.strip()
    if "\n" in title:
        title = title.split("\n")[0]
    if len(title) > 50:
        title = title[:47] + "..."
    return title


async def generate_suggested_questions(
    source_summaries: list[str],
    previous_response: str | None = None,
    provider_name: str = "ollama",
    model: str = "llama3.2",
    count: int = 3,
) -> list[str]:
    """Generate suggested questions based on sources or previous response."""
    if not source_summaries and not previous_response:
        return []

    provider = get_provider(provider_name)

    if previous_response:
        # Generate follow-up questions based on the response
        prompt = f"""Based on the following response, generate exactly {count} follow-up questions that a user might want to ask to learn more or dig deeper into the topic.

Response:
{previous_response[:2000]}

Generate exactly {count} questions. Return them as a JSON array of strings.
Only return the JSON array, nothing else. Example format: ["Question 1?", "Question 2?", "Question 3?"]"""
    else:
        # Generate initial questions based on source content
        context = "\n\n".join(s[:500] for s in source_summaries[:5])
        prompt = f"""Based on the following source content, generate exactly {count} thoughtful questions that would help someone learn from this material.

Source content:
{context}

Generate exactly {count} questions that cover different aspects of the content. Return them as a JSON array of strings.
Only return the JSON array, nothing else. Example format: ["Question 1?", "Question 2?", "Question 3?"]"""

    messages = [LLMChatMessage(role="user", content=prompt)]

    try:
        full_response = ""
        async for chunk in provider.chat_stream(messages, model):
            if chunk:
                full_response += chunk

        # Parse JSON response
        # Try to find JSON array in the response
        json_match = re.search(r"\[.*\]", full_response, re.DOTALL)
        if json_match:
            questions = json.loads(json_match.group())
            if isinstance(questions, list):
                return [str(q) for q in questions[:count]]

        return []
    except Exception:
        return []


def filter_and_score_sources(
    raw_sources: list[dict],
) -> tuple[list[dict], GroundingMetadata]:
    """Filter sources by relevance threshold and compute grounding confidence."""
    min_score = settings.rag_min_relevance_score
    high_threshold = settings.rag_high_relevance_threshold

    filtered_sources = [s for s in raw_sources if s["relevance_score"] >= min_score]
    filtered_count = len(raw_sources) - len(filtered_sources)

    for i, source in enumerate(filtered_sources):
        source["citation_index"] = i + 1

    if filtered_sources:
        scores = [s["relevance_score"] for s in filtered_sources]
        avg_relevance = sum(scores) / len(scores)
        high_count = sum(1 for s in scores if s >= high_threshold)
        confidence = min(1.0, avg_relevance * (0.7 + 0.3 * high_count / len(scores)))
    else:
        avg_relevance = 0.0
        confidence = 0.0

    metadata = GroundingMetadata(
        confidence_score=round(confidence, 4),
        has_relevant_sources=len(filtered_sources) > 0,
        avg_relevance=round(avg_relevance, 4),
        sources_used=len(filtered_sources),
        sources_filtered=filtered_count,
    )

    return filtered_sources, metadata


def build_rag_prompt(
    question: str,
    sources: list[dict],
    chat_style: str = "default",
    response_length: str = "default",
    custom_instructions: str | None = None,
    has_relevant_sources: bool = True,
) -> str:
    """Build the RAG prompt with sources and style configuration."""
    source_text = ""
    for source in sources:
        idx = source["citation_index"]
        source_text += f'\n[{idx}] From "{source["document_name"]}":\n{source["content"]}\n'

    if chat_style == "learning_guide":
        style_instruction = """You are a knowledgeable tutor helping someone learn from these materials.
Break down complex concepts into clear explanations. Use analogies and examples when helpful.
Ask follow-up questions to check understanding when appropriate."""
    elif chat_style == "custom" and custom_instructions:
        style_instruction = custom_instructions
    else:
        style_instruction = "You are a research assistant answering questions based strictly on the provided documents."

    if response_length == "shorter":
        length_instruction = (
            "Keep your response concise and to the point. Aim for 2-3 sentences when possible."
        )
    elif response_length == "longer":
        length_instruction = (
            "Provide detailed, comprehensive responses. Include relevant context and examples."
        )
    else:
        length_instruction = (
            "Provide appropriately detailed responses based on the complexity of the question."
        )

    formatting_instruction = """Format your response for readability:
- Use **bold** for key terms and important concepts
- Use bullet points or numbered lists when listing multiple items
- Keep paragraphs concise (2-4 sentences each)
- Use ### headings to organize distinct topics or sections when the answer covers multiple aspects"""

    grounding_rules = """CRITICAL GROUNDING RULES:
1. ONLY use information from the provided source documents. Do NOT use prior knowledge or training data.
2. Every factual claim MUST include a citation [1], [2], etc. referencing the source.
3. If the sources do not contain information to answer the question, you MUST respond:
   "I cannot answer this question based on your sources. The documents don't contain information about [topic]."
4. Do NOT speculate, infer, or extrapolate beyond what is explicitly stated in the sources.
5. If you are uncertain whether the sources support an answer, err on the side of saying you cannot answer."""

    if not has_relevant_sources:
        return f"""{style_instruction}

The user asked: "{question}"

You have searched the user's documents but found no relevant information to answer this question.

Respond with a helpful message explaining that you cannot answer based on their sources. Be specific about what topic they asked about and suggest they might add more relevant sources or rephrase their question.

Do NOT attempt to answer using your general knowledge."""

    return f"""{style_instruction}

{length_instruction}

{formatting_instruction}

{grounding_rules}

Use the following source documents to answer the user's question.

Sources:
{source_text}

Question: {question}"""


def retrieve_sources(
    query: str,
    notebook_id: str,
    document_ids: list[str] | None = None,
) -> list[dict]:
    """Retrieve and format sources from vector store."""
    query_embedding = embed_query(query)
    search_results = search_collection(
        notebook_id=notebook_id,
        query_embedding=query_embedding,
        n_results=settings.rag_max_context_chunks,
        document_ids=document_ids,
    )

    sources = []
    if search_results and search_results.get("ids") and search_results["ids"][0]:
        ids = search_results["ids"][0]
        documents = search_results.get("documents", [[]])[0]
        metadatas = search_results.get("metadatas", [[]])[0]
        distances = search_results.get("distances", [[]])[0]

        for i, chunk_id in enumerate(ids):
            metadata = metadatas[i] if i < len(metadatas) else {}
            content = documents[i] if i < len(documents) else ""
            distance = distances[i] if i < len(distances) else 1.0
            sources.append(
                {
                    "chunk_id": chunk_id,
                    "document_id": metadata.get("document_id", ""),
                    "document_name": metadata.get("document_name", ""),
                    "content": content,
                    "relevance_score": round(1.0 - distance, 4),
                    "citation_index": i + 1,
                }
            )

    return sources


async def stream_rag_response(
    query: str,
    notebook: Notebook,
    session_id: str,
    model: str,
    document_ids: list[str] | None = None,
    conversation_history: list[Message] | None = None,
) -> AsyncGenerator[str]:
    """Stream a RAG response with sources, grounding, and follow-up questions."""
    try:
        raw_sources = retrieve_sources(query, notebook.id, document_ids)
        sources, grounding_metadata = filter_and_score_sources(raw_sources)

        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
        yield f"data: {json.dumps({'type': 'grounding', 'metadata': grounding_metadata.model_dump()})}\n\n"

        prompt = build_rag_prompt(
            query,
            sources,
            chat_style=notebook.chat_style,
            response_length=notebook.response_length,
            custom_instructions=notebook.custom_instructions,
            has_relevant_sources=grounding_metadata.has_relevant_sources,
        )

        llm_messages = [
            LLMChatMessage(role=msg.role, content=msg.content)
            for msg in (conversation_history or [])
        ]
        llm_messages.append(LLMChatMessage(role="user", content=prompt))

        provider = get_provider(notebook.llm_provider)
        full_response = ""
        async for chunk in provider.chat_stream(llm_messages, model):
            if chunk:
                full_response += chunk
                yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

        async with async_session() as save_session:
            assistant_message = await create_message(
                save_session, session_id, "assistant", full_response, model
            )
            for source in sources:
                await add_message_source(
                    save_session,
                    assistant_message.id,
                    source["chunk_id"],
                    source["relevance_score"],
                    source["citation_index"],
                )

        yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_message.id})}\n\n"

        try:
            questions = await generate_suggested_questions(
                source_summaries=[],
                previous_response=full_response,
                provider_name=notebook.llm_provider,
                model=model,
            )
            if questions:
                yield f"data: {json.dumps({'type': 'suggestions', 'questions': questions})}\n\n"
        except Exception:
            pass

    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
