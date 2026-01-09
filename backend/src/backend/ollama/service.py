"""Ollama client service."""

from collections.abc import AsyncIterator
from typing import Any

import httpx

from src.backend.config import settings


async def check_connection() -> bool:
    """Check if Ollama is running and accessible."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{settings.ollama_base_url}/api/tags")
            return response.status_code == 200
    except (httpx.ConnectError, httpx.TimeoutException):
        return False


async def list_models() -> list[dict[str, Any]]:
    """List available models from Ollama."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(f"{settings.ollama_base_url}/api/tags")
        response.raise_for_status()
        data = response.json()
        return data.get("models", [])


async def get_model_info(model_name: str) -> dict[str, Any] | None:
    """Get information about a specific model."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/show",
            json={"name": model_name},
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()


async def pull_model(model_name: str) -> AsyncIterator[dict[str, Any]]:
    """Pull a model from Ollama, yielding progress updates."""
    async with (
        httpx.AsyncClient(timeout=None) as client,
        client.stream(
            "POST",
            f"{settings.ollama_base_url}/api/pull",
            json={"name": model_name, "stream": True},
        ) as response,
    ):
        response.raise_for_status()
        async for line in response.aiter_lines():
            if line:
                import json

                yield json.loads(line)


async def generate(
    model: str,
    prompt: str,
    system: str | None = None,
    context: list[int] | None = None,
    options: dict[str, Any] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Generate a response from Ollama, streaming tokens."""
    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": True,
    }
    if system:
        payload["system"] = system
    if context:
        payload["context"] = context
    if options:
        payload["options"] = options

    async with (
        httpx.AsyncClient(timeout=None) as client,
        client.stream(
            "POST",
            f"{settings.ollama_base_url}/api/generate",
            json=payload,
        ) as response,
    ):
        response.raise_for_status()
        async for line in response.aiter_lines():
            if line:
                import json

                yield json.loads(line)


async def chat(
    model: str,
    messages: list[dict[str, str]],
    options: dict[str, Any] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Chat with Ollama, streaming response."""
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": True,
    }
    if options:
        payload["options"] = options

    async with (
        httpx.AsyncClient(timeout=None) as client,
        client.stream(
            "POST",
            f"{settings.ollama_base_url}/api/chat",
            json=payload,
        ) as response,
    ):
        response.raise_for_status()
        async for line in response.aiter_lines():
            if line:
                import json

                yield json.loads(line)
