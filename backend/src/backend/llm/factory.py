"""LLM provider factory."""

from src.backend.llm.anthropic import AnthropicProvider
from src.backend.llm.base import LLMProvider
from src.backend.llm.ollama import OllamaProvider
from src.backend.llm.openai import OpenAIProvider

_providers: dict[str, LLMProvider] = {}


def get_provider(provider_name: str) -> LLMProvider:
    """Get an LLM provider by name (ollama, anthropic, openai)."""
    if provider_name not in _providers:
        if provider_name == "ollama":
            _providers[provider_name] = OllamaProvider()
        elif provider_name == "anthropic":
            _providers[provider_name] = AnthropicProvider()
        elif provider_name == "openai":
            _providers[provider_name] = OpenAIProvider()
        else:
            raise ValueError(f"Unknown LLM provider: {provider_name}")

    return _providers[provider_name]
