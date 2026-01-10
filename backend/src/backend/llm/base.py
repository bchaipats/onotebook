"""Base LLM provider protocol."""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass
class ChatMessage:
    """A chat message."""

    role: str  # "user", "assistant", or "system"
    content: str


@dataclass
class StreamChunk:
    """A chunk of streaming response."""

    content: str
    is_done: bool = False


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name."""
        ...

    @abstractmethod
    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str,
    ) -> AsyncIterator[StreamChunk]:
        """Stream a chat response.

        Args:
            messages: List of chat messages.
            model: Model name to use.

        Yields:
            StreamChunk with content and done flag.
        """
        ...

    @abstractmethod
    async def list_models(self) -> list[str]:
        """List available models for this provider.

        Returns:
            List of model names.
        """
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Check if this provider is available (e.g., API key configured).

        Returns:
            True if provider can be used.
        """
        ...
