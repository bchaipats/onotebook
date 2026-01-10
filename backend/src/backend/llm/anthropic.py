"""Anthropic Claude LLM provider."""

import json
from collections.abc import AsyncIterator

import httpx

from src.backend.config import settings
from src.backend.llm.base import ChatMessage, LLMProvider

CLAUDE_MODELS = [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
]


class AnthropicProvider(LLMProvider):
    def is_available(self) -> bool:
        return bool(settings.anthropic_api_key)

    async def list_models(self) -> list[str]:
        return CLAUDE_MODELS if self.is_available() else []

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str,
    ) -> AsyncIterator[str]:
        if not settings.anthropic_api_key:
            raise ValueError("Anthropic API key not configured")

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

                data_str = line[6:]
                if data_str == "[DONE]":
                    break

                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                if data.get("type") == "content_block_delta":
                    delta = data.get("delta", {})
                    if delta.get("type") == "text_delta":
                        yield delta.get("text", "")
