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
    # Chat configuration
    chat_style: str | None = Field(None, pattern=r"^(default|learning_guide|custom)$")
    response_length: str | None = Field(None, pattern=r"^(shorter|default|longer)$")
    custom_instructions: str | None = Field(None, max_length=2000)
    llm_provider: str | None = Field(None, pattern=r"^(ollama|anthropic|openai)$")
    llm_model: str | None = Field(None, max_length=100)


class NotebookResponse(BaseModel):
    id: str
    name: str
    description: str | None
    color: str | None
    document_count: int
    created_at: datetime
    updated_at: datetime
    # Chat configuration
    chat_style: str
    response_length: str
    custom_instructions: str | None
    llm_provider: str
    llm_model: str

    model_config = {"from_attributes": True}


class NotebookListResponse(BaseModel):
    notebooks: list[NotebookResponse]
