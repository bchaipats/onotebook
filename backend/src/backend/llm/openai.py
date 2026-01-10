"""OpenAI LLM provider."""

from collections.abc import AsyncIterator

import httpx

from src.backend.config import settings
from src.backend.llm.base import ChatMessage, LLMProvider, StreamChunk

# Available OpenAI models
OPENAI_MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
]


class OpenAIProvider(LLMProvider):
    """OpenAI GPT LLM provider."""

    @property
    def name(self) -> str:
        return "openai"

    def is_available(self) -> bool:
        return bool(settings.openai_api_key)

    async def list_models(self) -> list[str]:
        """List available OpenAI models."""
        if not self.is_available():
            return []
        return OPENAI_MODELS

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str,
    ) -> AsyncIterator[StreamChunk]:
        """Stream chat response from OpenAI."""
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not configured")

        # Convert messages to OpenAI format
        openai_messages = [{"role": m.role, "content": m.content} for m in messages]

        payload = {
            "model": model,
            "messages": openai_messages,
            "stream": True,
        }

        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }

        async with (
            httpx.AsyncClient(timeout=None) as client,
            client.stream(
                "POST",
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers=headers,
            ) as response,
        ):
            response.raise_for_status()

            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue

                data_str = line[6:]  # Remove "data: " prefix
                if data_str == "[DONE]":
                    yield StreamChunk(content="", is_done=True)
                    break

                import json

                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                choices = data.get("choices", [])
                if choices:
                    delta = choices[0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        yield StreamChunk(content=content)

                    # Check if finished
                    if choices[0].get("finish_reason"):
                        yield StreamChunk(content="", is_done=True)
