from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.backend.chat import router as chat_router
from src.backend.config import settings
from src.backend.database import init_db
from src.backend.documents import router as documents_router
from src.backend.health import router as health_router
from src.backend.notebooks import router as notebooks_router
from src.backend.notes import router as notes_router
from src.backend.ollama import router as ollama_router
from src.backend.settings import router as settings_router
from src.backend.sources import router as sources_router
from src.backend.studio import router as studio_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan handler for startup and shutdown."""
    # Startup: Create data directories
    Path(settings.upload_directory).mkdir(parents=True, exist_ok=True)
    Path(settings.chroma_persist_directory).mkdir(parents=True, exist_ok=True)

    # Initialize database
    await init_db()

    yield

    # Shutdown: cleanup if needed


app = FastAPI(
    title="onotebook API",
    description="Open-source RAG knowledge assistant API",
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS middleware for frontend access
origins = [origin.strip() for origin in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(notebooks_router)
app.include_router(documents_router)
app.include_router(sources_router)
app.include_router(ollama_router)
app.include_router(chat_router)
app.include_router(notes_router)
app.include_router(settings_router)
app.include_router(studio_router)
