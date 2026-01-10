"""LLM provider factory."""

from src.backend.llm.anthropic import AnthropicProvider
from src.backend.llm.base import LLMProvider
from src.backend.llm.ollama import OllamaProvider
from src.backend.llm.openai import OpenAIProvider

# Provider instances (singletons)
_providers: dict[str, LLMProvider] = {}


def get_provider(provider_name: str) -> LLMProvider:
    """Get an LLM provider by name.

    Args:
        provider_name: One of "ollama", "anthropic", "openai".

    Returns:
        The LLM provider instance.

    Raises:
        ValueError: If provider name is unknown.
    """
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


def list_available_providers() -> list[str]:
    """List all available (configured) providers.

    Returns:
        List of provider names that are available.
    """
    providers = ["ollama", "anthropic", "openai"]
    return [p for p in providers if get_provider(p).is_available()]
