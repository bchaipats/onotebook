from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ChatSessionCreate(BaseModel):
    title: str | None = None


class ChatSessionResponse(BaseModel):
    id: str
    notebook_id: str
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionListResponse(BaseModel):
    sessions: list[ChatSessionResponse]


class MessageResponse(BaseModel):
    id: str
    chat_session_id: str
    role: str
    content: str
    model: str | None
    feedback: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]


class SendMessageRequest(BaseModel):
    content: str
    model: str | None = None
    document_ids: list[str] | None = None


class SourceInfo(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    content: str
    relevance_score: float
    citation_index: int


class MessageFeedbackRequest(BaseModel):
    feedback: Literal["up", "down"] | None


class SuggestedQuestionsResponse(BaseModel):
    questions: list[str]
