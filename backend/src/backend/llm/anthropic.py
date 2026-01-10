"""Anthropic Claude LLM provider."""

from collections.abc import AsyncIterator

import httpx

from src.backend.config import settings
from src.backend.llm.base import ChatMessage, LLMProvider, StreamChunk

# Available Claude models
CLAUDE_MODELS = [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
]


class AnthropicProvider(LLMProvider):
    """Anthropic Claude LLM provider."""

    @property
    def name(self) -> str:
        return "anthropic"

    def is_available(self) -> bool:
        return bool(settings.anthropic_api_key)

    async def list_models(self) -> list[str]:
        """List available Claude models."""
        if not self.is_available():
            return []
        return CLAUDE_MODELS

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str,
    ) -> AsyncIterator[StreamChunk]:
        """Stream chat response from Anthropic Claude."""
        if not settings.anthropic_api_key:
            raise ValueError("Anthropic API key not configured")

        # Convert messages to Anthropic format
        # Extract system message if present
        system_message = None
        anthropic_messages = []
        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                anthropic_messages.append({"role": msg.role, "content": msg.content})

        payload = {
            "model": model,
            "max_tokens": 4096,
            "messages": anthropic_messages,
            "stream": True,
        }
        if system_message:
            payload["system"] = system_message

        headers = {
            "x-api-key": settings.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        async with (
            httpx.AsyncClient(timeout=None) as client,
            client.stream(
                "POST",
                "https://api.anthropic.com/v1/messages",
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

                event_type = data.get("type")

                if event_type == "content_block_delta":
                    delta = data.get("delta", {})
                    if delta.get("type") == "text_delta":
                        yield StreamChunk(content=delta.get("text", ""))

                elif event_type == "message_stop":
                    yield StreamChunk(content="", is_done=True)
