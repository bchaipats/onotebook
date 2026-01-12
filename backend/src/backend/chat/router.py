from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.chat import service
from src.backend.chat.schemas import (
    ChatSessionCreate,
    ChatSessionListResponse,
    ChatSessionResponse,
    MessageFeedbackRequest,
    MessageListResponse,
    MessageResponse,
    SendMessageRequest,
    SuggestedQuestionsResponse,
)
from src.backend.config import settings
from src.backend.database import get_session
from src.backend.documents.service import list_documents
from src.backend.llm import get_provider
from src.backend.notebooks.service import get_notebook

router = APIRouter(prefix="/api", tags=["chat"])


def session_to_response(chat_session) -> ChatSessionResponse:
    return ChatSessionResponse(
        id=chat_session.id,
        notebook_id=chat_session.notebook_id,
        title=chat_session.title,
        created_at=chat_session.created_at,
        updated_at=chat_session.updated_at,
    )


def message_to_response(message) -> MessageResponse:
    return MessageResponse(
        id=message.id,
        chat_session_id=message.chat_session_id,
        role=message.role,
        content=message.content,
        model=message.model,
        feedback=message.feedback,
        created_at=message.created_at,
    )


@router.get(
    "/notebooks/{notebook_id}/sessions",
    response_model=ChatSessionListResponse,
)
async def list_sessions(
    notebook_id: str,
    session: AsyncSession = Depends(get_session),
) -> ChatSessionListResponse:
    """List all chat sessions in a notebook."""
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    sessions = await service.list_sessions(session, notebook_id)
    return ChatSessionListResponse(sessions=[session_to_response(s) for s in sessions])


@router.get(
    "/notebooks/{notebook_id}/suggested-questions",
    response_model=SuggestedQuestionsResponse,
)
async def get_suggested_questions(
    notebook_id: str,
    db_session: AsyncSession = Depends(get_session),
) -> SuggestedQuestionsResponse:
    """Get suggested questions based on notebook sources."""
    notebook = await get_notebook(db_session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    documents = await list_documents(db_session, notebook_id)
    ready_docs = [d for d in documents if d.processing_status == "ready"]

    if not ready_docs:
        return SuggestedQuestionsResponse(questions=[])

    source_summaries = [doc.summary or f"Document: {doc.filename}" for doc in ready_docs[:5]]

    questions = await service.generate_suggested_questions(
        source_summaries=source_summaries,
        provider_name=notebook.llm_provider,
        model=notebook.llm_model or settings.default_llm_model,
    )

    return SuggestedQuestionsResponse(questions=questions)


@router.post(
    "/notebooks/{notebook_id}/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    notebook_id: str,
    data: ChatSessionCreate,
    session: AsyncSession = Depends(get_session),
) -> ChatSessionResponse:
    """Create a new chat session."""
    notebook = await get_notebook(session, notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    chat_session = await service.create_session(session, notebook_id, data.title)
    return session_to_response(chat_session)


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session_detail(
    session_id: str,
    session: AsyncSession = Depends(get_session),
) -> ChatSessionResponse:
    """Get a chat session by ID."""
    chat_session = await service.get_session(session, session_id)
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    return session_to_response(chat_session)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a chat session."""
    chat_session = await service.get_session(session, session_id)
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )
    await service.delete_session(session, chat_session)


@router.get("/sessions/{session_id}/messages", response_model=MessageListResponse)
async def get_messages(
    session_id: str,
    session: AsyncSession = Depends(get_session),
) -> MessageListResponse:
    """Get all messages in a chat session."""
    chat_session = await service.get_session(session, session_id)
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    messages = await service.get_messages(session, session_id)
    return MessageListResponse(messages=[message_to_response(m) for m in messages])


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    db_session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Send a message and get a streaming response."""
    chat_session = await service.get_session(db_session, session_id)
    if not chat_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    notebook = await get_notebook(db_session, chat_session.notebook_id)
    if not notebook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found")

    model = request.model or notebook.llm_model or settings.default_llm_model

    await service.create_message(db_session, session_id, "user", request.content)

    if not chat_session.title:
        title = service.generate_title_from_message(request.content)
        await service.update_session_title(db_session, chat_session, title)

    messages = await service.get_messages(db_session, session_id)
    history = messages[:-1] if messages else []

    return StreamingResponse(
        service.stream_rag_response(
            query=request.content,
            notebook=notebook,
            session_id=session_id,
            model=model,
            document_ids=request.document_ids,
            conversation_history=history,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/messages/{message_id}/regenerate")
async def regenerate_message(
    message_id: str,
    db_session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Regenerate the last assistant response."""
    message = await service.get_message(db_session, message_id)
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    if message.role != "assistant":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Can only regenerate assistant messages"
        )

    chat_session = await service.get_session(db_session, message.chat_session_id)
    if not chat_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    await db_session.delete(message)
    await db_session.commit()

    messages = await service.get_messages(db_session, chat_session.id)
    if not messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No messages to regenerate from"
        )

    last_user_message = next((m for m in reversed(messages) if m.role == "user"), None)
    if not last_user_message:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No user message found")

    notebook = await get_notebook(db_session, chat_session.notebook_id)
    if not notebook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found")

    model = message.model or notebook.llm_model or settings.default_llm_model
    history = [m for m in messages if m.id != last_user_message.id]

    return StreamingResponse(
        service.stream_rag_response(
            query=last_user_message.content,
            notebook=notebook,
            session_id=chat_session.id,
            model=model,
            conversation_history=history,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/messages/{message_id}/feedback", response_model=MessageResponse)
async def set_message_feedback(
    message_id: str,
    request: MessageFeedbackRequest,
    db_session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    """Set feedback (thumbs up/down) on a message."""
    message = await service.get_message(db_session, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    if message.role != "assistant":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only give feedback on assistant messages",
        )

    message.feedback = request.feedback
    db_session.add(message)
    await db_session.commit()
    await db_session.refresh(message)

    return message_to_response(message)


@router.get("/llm/providers")
async def list_llm_providers():
    """List available LLM providers and their models."""
    providers = []
    for provider_name in ["ollama", "anthropic", "openai"]:
        provider = get_provider(provider_name)
        is_available = provider.is_available()
        models = await provider.list_models() if is_available else []
        providers.append(
            {
                "name": provider_name,
                "available": is_available,
                "models": models,
            }
        )
    return {"providers": providers}
