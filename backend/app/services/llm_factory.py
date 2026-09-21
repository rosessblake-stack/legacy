from functools import lru_cache

from langchain_core.language_models import BaseChatModel

from app.core.config import Settings


class LLMConfigurationError(RuntimeError):
    pass


@lru_cache
def _cached_model(provider: str, model: str, temperature: float, api_key: str) -> BaseChatModel:
    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=model, temperature=temperature, api_key=api_key)
    if provider == "openai":
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=model, temperature=temperature, api_key=api_key)
    raise LLMConfigurationError(f"Unsupported LLM provider: {provider}")


def get_chat_model(settings: Settings) -> BaseChatModel:
    api_key = settings.anthropic_api_key if settings.llm_provider == "anthropic" else settings.openai_api_key
    if not api_key:
        raise LLMConfigurationError(
            f"Missing API key for llm_provider={settings.llm_provider!r}. "
            "Set ANTHROPIC_API_KEY or OPENAI_API_KEY."
        )
    return _cached_model(settings.llm_provider, settings.llm_model, settings.llm_temperature, api_key)
