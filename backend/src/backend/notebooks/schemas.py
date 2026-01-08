from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NotebookCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class NotebookUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    color: Optional[str] = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class NotebookResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    color: Optional[str]
    document_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotebookListResponse(BaseModel):
    notebooks: list[NotebookResponse]
