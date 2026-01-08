import httpx
from fastapi import APIRouter

from src.backend.config import settings
from src.backend.health.schemas import HealthResponse

router = APIRouter(prefix="/api", tags=["health"])


async def check_ollama_connection() -> bool:
    """Check if Ollama is running and accessible."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{settings.ollama_base_url}/api/tags")
            return response.status_code == 200
    except (httpx.ConnectError, httpx.TimeoutException):
        return False


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check the health status of the application."""
    ollama_connected = await check_ollama_connection()

    return HealthResponse(
        status="healthy",
        ollama_connected=ollama_connected,
        version=settings.app_version,
    )
