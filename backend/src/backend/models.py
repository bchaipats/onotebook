from datetime import UTC, datetime
from uuid import uuid4

from sqlmodel import Field, Relationship, SQLModel


def generate_uuid() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


class Notebook(SQLModel, table=True):
    __tablename__ = "notebook"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    name: str = Field(nullable=False, index=True)
    description: str | None = None
    color: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    documents: list["Document"] = Relationship(
        back_populates="notebook",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    chat_sessions: list["ChatSession"] = Relationship(
        back_populates="notebook",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Document(SQLModel, table=True):
    __tablename__ = "document"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    notebook_id: str = Field(foreign_key="notebook.id", nullable=False, index=True)
    filename: str = Field(nullable=False)
    file_type: str = Field(nullable=False)
    file_size: int = Field(nullable=False)
    file_path: str = Field(nullable=False)
    page_count: int | None = None
    chunk_count: int = Field(default=0)
    processing_status: str = Field(default="pending", index=True)
    processing_progress: int = Field(default=0)  # 0-100 percentage
    processing_error: str | None = None
    created_at: datetime = Field(default_factory=utc_now)

    # Source type classification: file, url, youtube, paste
    source_type: str = Field(default="file", index=True)
    # Original URL for url/youtube sources
    source_url: str | None = None
    # AI-generated source guide summary
    summary: str | None = None
    summary_generated_at: datetime | None = None

    notebook: Notebook | None = Relationship(back_populates="documents")
    chunks: list["Chunk"] = Relationship(
        back_populates="document",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Chunk(SQLModel, table=True):
    __tablename__ = "chunk"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    document_id: str = Field(foreign_key="document.id", nullable=False, index=True)
    chunk_index: int = Field(nullable=False)
    content: str = Field(nullable=False)
    token_count: int = Field(nullable=False)
    page_number: int | None = None
    embedding_id: str | None = None

    document: Document | None = Relationship(back_populates="chunks")
    message_sources: list["MessageSource"] = Relationship(
        back_populates="chunk",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class ChatSession(SQLModel, table=True):
    __tablename__ = "chat_session"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    notebook_id: str = Field(foreign_key="notebook.id", nullable=False, index=True)
    title: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    notebook: Notebook | None = Relationship(back_populates="chat_sessions")
    messages: list["Message"] = Relationship(
        back_populates="chat_session",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Message(SQLModel, table=True):
    __tablename__ = "message"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    chat_session_id: str = Field(foreign_key="chat_session.id", nullable=False, index=True)
    role: str = Field(nullable=False)  # 'user' or 'assistant'
    content: str = Field(nullable=False)
    model: str | None = None
    created_at: datetime = Field(default_factory=utc_now)

    chat_session: ChatSession | None = Relationship(back_populates="messages")
    sources: list["MessageSource"] = Relationship(
        back_populates="message",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class MessageSource(SQLModel, table=True):
    __tablename__ = "message_source"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    message_id: str = Field(foreign_key="message.id", nullable=False, index=True)
    chunk_id: str = Field(foreign_key="chunk.id", nullable=False, index=True)
    relevance_score: float = Field(nullable=False)
    citation_index: int = Field(nullable=False)

    message: Message | None = Relationship(back_populates="sources")
    chunk: Chunk | None = Relationship(back_populates="message_sources")


class Setting(SQLModel, table=True):
    __tablename__ = "setting"

    key: str = Field(primary_key=True)
    value: str = Field(nullable=False)  # JSON string
