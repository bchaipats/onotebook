"""OpenAI LLM provider."""

import json
from collections.abc import AsyncIterator

import httpx

from src.backend.config import settings
from src.backend.llm.base import ChatMessage, LLMProvider

OPENAI_MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
]


class OpenAIProvider(LLMProvider):
    def is_available(self) -> bool:
        return bool(settings.openai_api_key)

    async def list_models(self) -> list[str]:
        return OPENAI_MODELS if self.is_available() else []

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str,
    ) -> AsyncIterator[str]:
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key not configured")

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

                data_str = line[6:]
                if data_str == "[DONE]":
                    break

                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue

                choices = data.get("choices", [])
                if choices:
                    delta = choices[0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        yield content
