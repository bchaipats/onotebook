from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel

from src.backend.config import settings


def get_database_url() -> str:
    """Get the database URL, ensuring the data directory exists."""
    url = settings.database_url

    # Extract path from sqlite URL and ensure directory exists
    if url.startswith("sqlite"):
        # Handle both sqlite:/// and sqlite+aiosqlite:///
        path_part = url.split("///")[-1]
        if path_part.startswith("."):
            db_path = Path(path_part)
            db_path.parent.mkdir(parents=True, exist_ok=True)

    return url


engine = create_async_engine(
    get_database_url(),
    echo=False,
    future=True,
)

async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Initialize the database, creating all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    await run_migrations()


async def run_migrations() -> None:
    """Run database migrations for schema changes."""
    import contextlib

    from sqlalchemy import text

    migrations = [
        # Add chat configuration columns to notebook table
        ("notebook", "chat_style", "VARCHAR DEFAULT 'default'"),
        ("notebook", "response_length", "VARCHAR DEFAULT 'default'"),
        ("notebook", "custom_instructions", "TEXT"),
        ("notebook", "llm_provider", "VARCHAR DEFAULT 'ollama'"),
        ("notebook", "llm_model", "VARCHAR DEFAULT 'llama3.2'"),
    ]

    async with engine.begin() as conn:
        for table, column, column_def in migrations:
            # Skip if column already exists
            with contextlib.suppress(Exception):
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {column_def}"))


async def get_session() -> AsyncGenerator[AsyncSession]:
    """Dependency to get an async database session."""
    async with async_session() as session:
        yield session
