import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.backend.chat import service
from src.backend.chat.schemas import (
    ChatSessionCreate,
    ChatSessionListResponse,
    ChatSessionResponse,
    MessageListResponse,
    MessageResponse,
    SendMessageRequest,
)
from src.backend.config import settings
from src.backend.database import async_session, get_session
from src.backend.embedding.service import embed_query
from src.backend.embedding.vectorstore import search_collection
from src.backend.llm import get_provider
from src.backend.llm.base import ChatMessage as LLMChatMessage
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


def build_rag_prompt(
    question: str,
    sources: list[dict],
    chat_style: str = "default",
    response_length: str = "default",
    custom_instructions: str | None = None,
) -> str:
    """Build the RAG prompt with sources and style configuration."""
    source_text = ""
    for i, source in enumerate(sources, 1):
        source_text += f'\n[{i}] From "{source["document_name"]}":\n{source["content"]}\n'

    # Build style instructions
    style_instruction = ""
    if chat_style == "learning_guide":
        style_instruction = """You are a knowledgeable tutor helping someone learn from these materials.
Break down complex concepts into clear explanations. Use analogies and examples when helpful.
Ask follow-up questions to check understanding when appropriate."""
    elif chat_style == "custom" and custom_instructions:
        style_instruction = custom_instructions
    else:
        style_instruction = "You are a helpful assistant answering questions based on the provided documents."

    # Build length instructions
    length_instruction = ""
    if response_length == "shorter":
        length_instruction = "Keep your response concise and to the point. Aim for 2-3 sentences when possible."
    elif response_length == "longer":
        length_instruction = "Provide detailed, comprehensive responses. Include relevant context and examples."
    else:
        length_instruction = "Provide appropriately detailed responses based on the complexity of the question."

    return f"""{style_instruction}

{length_instruction}

Use the following context to answer the user's question. If the context doesn't contain relevant information, say so.

When using information from the context, cite your sources using [1], [2], etc. corresponding to the source numbers provided.

Context:
{source_text}

Question: {question}"""


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    request: SendMessageRequest,
    db_session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Send a message and get a streaming response."""
    chat_session = await service.get_session(db_session, session_id)
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Get notebook with chat configuration
    notebook = await get_notebook(db_session, chat_session.notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    notebook_id = notebook.id
    model = request.model or notebook.llm_model or settings.default_llm_model

    # Save user message
    await service.create_message(
        db_session,
        session_id,
        role="user",
        content=request.content,
    )

    # Update session title if first message
    if not chat_session.title:
        title = service.generate_title_from_message(request.content)
        await service.update_session_title(db_session, chat_session, title)

    async def generate_response():
        sources: list[dict] = []

        try:
            # Retrieve relevant chunks (filtered by selected sources if provided)
            query_embedding = embed_query(request.content)
            search_results = search_collection(
                notebook_id=notebook_id,
                query_embedding=query_embedding,
                n_results=5,
                document_ids=request.document_ids,
            )

            # Process search results
            if search_results and search_results.get("ids") and search_results["ids"][0]:
                ids = search_results["ids"][0]
                documents = search_results.get("documents", [[]])[0]
                metadatas = search_results.get("metadatas", [[]])[0]
                distances = search_results.get("distances", [[]])[0]

                for i, chunk_id in enumerate(ids):
                    metadata = metadatas[i] if i < len(metadatas) else {}
                    content = documents[i] if i < len(documents) else ""
                    distance = distances[i] if i < len(distances) else 1.0
                    relevance_score = 1.0 - distance

                    sources.append(
                        {
                            "chunk_id": chunk_id,
                            "document_id": metadata.get("document_id", ""),
                            "document_name": metadata.get("document_name", ""),
                            "content": content,
                            "relevance_score": round(relevance_score, 4),
                            "citation_index": i + 1,
                        }
                    )

            # Send sources first
            yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

            # Build prompt with notebook's chat configuration
            prompt = build_rag_prompt(
                request.content,
                sources,
                chat_style=notebook.chat_style,
                response_length=notebook.response_length,
                custom_instructions=notebook.custom_instructions,
            )

            # Get conversation history
            messages_history = await service.get_messages(db_session, session_id)
            llm_messages: list[LLMChatMessage] = []
            for msg in messages_history[:-1]:  # Exclude the just-added user message
                llm_messages.append(LLMChatMessage(role=msg.role, content=msg.content))
            # Add current message with RAG context
            llm_messages.append(LLMChatMessage(role="user", content=prompt))

            # Stream response from LLM provider
            provider = get_provider(notebook.llm_provider)
            full_response = ""
            async for chunk in provider.chat_stream(llm_messages, model):
                if chunk.content:
                    full_response += chunk.content
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"

            # Save assistant message
            async with async_session() as save_session:
                assistant_message = await service.create_message(
                    save_session,
                    session_id,
                    role="assistant",
                    content=full_response,
                    model=model,
                )

                # Save sources
                for source in sources:
                    await service.add_message_source(
                        save_session,
                        assistant_message.id,
                        source["chunk_id"],
                        source["relevance_score"],
                        source["citation_index"],
                    )

            yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_message.id})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/messages/{message_id}/regenerate")
async def regenerate_message(
    message_id: str,
    db_session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Regenerate the last assistant response."""
    message = await service.get_message(db_session, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    if message.role != "assistant":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only regenerate assistant messages",
        )

    chat_session = await service.get_session(db_session, message.chat_session_id)
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Delete the message to regenerate
    await db_session.delete(message)
    await db_session.commit()

    # Get the last user message
    messages = await service.get_messages(db_session, chat_session.id)
    if not messages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No messages to regenerate from",
        )

    last_user_message = None
    for msg in reversed(messages):
        if msg.role == "user":
            last_user_message = msg
            break

    if not last_user_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No user message found",
        )

    # Regenerate using the last user message
    # Get notebook with chat configuration
    notebook = await get_notebook(db_session, chat_session.notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    notebook_id = notebook.id
    model = message.model or notebook.llm_model or settings.default_llm_model

    async def generate_response():
        sources: list[dict] = []

        try:
            # Retrieve relevant chunks
            query_embedding = embed_query(last_user_message.content)
            search_results = search_collection(
                notebook_id=notebook_id,
                query_embedding=query_embedding,
                n_results=5,
            )

            # Process search results
            if search_results and search_results.get("ids") and search_results["ids"][0]:
                ids = search_results["ids"][0]
                documents = search_results.get("documents", [[]])[0]
                metadatas = search_results.get("metadatas", [[]])[0]
                distances = search_results.get("distances", [[]])[0]

                for i, chunk_id in enumerate(ids):
                    metadata = metadatas[i] if i < len(metadatas) else {}
                    content = documents[i] if i < len(documents) else ""
                    distance = distances[i] if i < len(distances) else 1.0
                    relevance_score = 1.0 - distance

                    sources.append(
                        {
                            "chunk_id": chunk_id,
                            "document_id": metadata.get("document_id", ""),
                            "document_name": metadata.get("document_name", ""),
                            "content": content,
                            "relevance_score": round(relevance_score, 4),
                            "citation_index": i + 1,
                        }
                    )

            # Send sources first
            yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

            # Build prompt with notebook's chat configuration
            prompt = build_rag_prompt(
                last_user_message.content,
                sources,
                chat_style=notebook.chat_style,
                response_length=notebook.response_length,
                custom_instructions=notebook.custom_instructions,
            )

            # Get conversation history (without the deleted assistant message)
            messages_history = await service.get_messages(db_session, chat_session.id)
            llm_messages: list[LLMChatMessage] = []
            for msg in messages_history:
                if msg.id == last_user_message.id:
                    # Use RAG prompt for this message
                    llm_messages.append(LLMChatMessage(role="user", content=prompt))
                else:
                    llm_messages.append(
                        LLMChatMessage(role=msg.role, content=msg.content)
                    )

            # Stream response from LLM provider
            provider = get_provider(notebook.llm_provider)
            full_response = ""
            async for chunk in provider.chat_stream(llm_messages, model):
                if chunk.content:
                    full_response += chunk.content
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk.content})}\n\n"

            # Save assistant message
            async with async_session() as save_session:
                assistant_message = await service.create_message(
                    save_session,
                    chat_session.id,
                    role="assistant",
                    content=full_response,
                    model=model,
                )

                # Save sources
                for source in sources:
                    await service.add_message_source(
                        save_session,
                        assistant_message.id,
                        source["chunk_id"],
                        source["relevance_score"],
                        source["citation_index"],
                    )

            yield f"data: {json.dumps({'type': 'done', 'message_id': assistant_message.id})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


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
