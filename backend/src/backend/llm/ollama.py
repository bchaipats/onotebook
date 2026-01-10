"""Ollama LLM provider."""

from collections.abc import AsyncIterator

import httpx

from src.backend.config import settings
from src.backend.llm.base import ChatMessage, LLMProvider, StreamChunk


class OllamaProvider(LLMProvider):
    """Ollama LLM provider for local models."""

    @property
    def name(self) -> str:
        return "ollama"

    def is_available(self) -> bool:
        # Ollama is always available as a provider option
        return True

    async def list_models(self) -> list[str]:
        """List available Ollama models."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{settings.ollama_base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                models = data.get("models", [])
                return [m["name"] for m in models]
        except (httpx.ConnectError, httpx.TimeoutException):
            return []

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str,
    ) -> AsyncIterator[StreamChunk]:
        """Stream chat response from Ollama."""
        import json

        ollama_messages = [{"role": m.role, "content": m.content} for m in messages]

        payload = {
            "model": model,
            "messages": ollama_messages,
            "stream": True,
        }

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
                    data = json.loads(line)
                    if "message" in data and "content" in data["message"]:
                        yield StreamChunk(
                            content=data["message"]["content"],
                            is_done=data.get("done", False),
                        )
                    elif data.get("done"):
                        yield StreamChunk(content="", is_done=True)
