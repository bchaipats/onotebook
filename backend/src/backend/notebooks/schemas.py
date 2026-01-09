from datetime import datetime

from pydantic import BaseModel, Field


class NotebookCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class NotebookUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class NotebookResponse(BaseModel):
    id: str
    name: str
    description: str | None
    color: str | None
    document_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotebookListResponse(BaseModel):
    notebooks: list[NotebookResponse]
