from datetime import datetime

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    title: str | None = Field(None, max_length=200)
    content: str = Field(..., min_length=1)
    source_message_id: str | None = None


class NoteUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    content: str | None = Field(None, min_length=1)


class NoteResponse(BaseModel):
    id: str
    notebook_id: str
    title: str | None
    content: str
    source_message_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    notes: list[NoteResponse]
