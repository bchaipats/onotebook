from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
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


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get an async database session."""
    async with async_session() as session:
        yield session
