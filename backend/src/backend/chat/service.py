"""Chat service for session and message management."""

import json
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.llm import get_provider
from src.backend.llm.base import ChatMessage as LLMChatMessage
from src.backend.models import ChatSession, Message, MessageSource, utc_now


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


def generate_title_from_message(content: str) -> str:
    """Generate a session title from the first message."""
    # Take first 50 chars or first sentence
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
    """Generate suggested questions based on sources or previous response.

    Args:
        source_summaries: List of source content snippets to base questions on
        previous_response: Previous assistant response for follow-up questions
        provider_name: LLM provider to use
        model: Model name to use
        count: Number of questions to generate

    Returns:
        List of suggested questions
    """
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
