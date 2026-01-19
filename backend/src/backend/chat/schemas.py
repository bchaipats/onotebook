from datetime import UTC, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, PlainSerializer

# Serialize datetime to ISO format with Z suffix for UTC
UTCDateTime = Annotated[
    datetime,
    PlainSerializer(
        lambda dt: dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        return_type=str,
    ),
]


class ChatSessionCreate(BaseModel):
    title: str | None = None


class ChatSessionResponse(BaseModel):
    id: str
    notebook_id: str
    title: str | None
    created_at: UTCDateTime
    updated_at: UTCDateTime

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
    created_at: UTCDateTime

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


class GroundingMetadata(BaseModel):
    confidence_score: float  # 0.0-1.0 overall grounding confidence
    has_relevant_sources: bool  # Whether any sources met the relevance threshold
    avg_relevance: float  # Average relevance of sources used
    sources_used: int  # Number of sources included in context
    sources_filtered: int  # Number of sources excluded due to low relevance


class MessageFeedbackRequest(BaseModel):
    feedback: Literal["up", "down"] | None


class RegenerateRequest(BaseModel):
    instruction: str | None = None


class EditMessageRequest(BaseModel):
    content: str


class SuggestedQuestionsResponse(BaseModel):
    questions: list[str]
