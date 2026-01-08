import json

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from src.backend.ollama import service
from src.backend.ollama.schemas import (
    ModelInfo,
    ModelListResponse,
    PullModelRequest,
)

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("", response_model=ModelListResponse)
async def list_models() -> ModelListResponse:
    """List all available Ollama models."""
    try:
        models = await service.list_models()
        return ModelListResponse(
            models=[
                ModelInfo(
                    name=m.get("name", ""),
                    size=m.get("size", 0),
                    parameter_size=m.get("details", {}).get("parameter_size"),
                    quantization_level=m.get("details", {}).get("quantization_level"),
                    modified_at=m.get("modified_at"),
                    digest=m.get("digest"),
                )
                for m in models
            ]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to Ollama: {str(e)}",
        )


@router.get("/{model_name}")
async def get_model(model_name: str) -> dict:
    """Get information about a specific model."""
    try:
        info = await service.get_model_info(model_name)
        if not info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model '{model_name}' not found",
            )
        return info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to Ollama: {str(e)}",
        )


@router.post("/pull")
async def pull_model(request: PullModelRequest) -> StreamingResponse:
    """Pull a model from Ollama registry with streaming progress."""

    async def generate_progress():
        try:
            async for progress in service.pull_model(request.name):
                yield f"data: {json.dumps(progress)}\n\n"
            yield f"data: {json.dumps({'status': 'complete'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate_progress(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
