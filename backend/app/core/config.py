from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "staging", "production"] = "development"

    database_url: str = Field(
        default="postgresql+asyncpg://ontonav:ontonav@localhost:5432/ontonav",
        description="Async SQLAlchemy connection string, must use the asyncpg driver.",
    )

    llm_provider: Literal["openai", "anthropic"] = "anthropic"
    llm_model: str = "claude-sonnet-5"
    llm_temperature: float = 0.2
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None

    whisper_model: str = "whisper-1"
    whisper_language: str = "es"

    admin_api_key: str = Field(
        default="change-me-in-production",
        description="Bearer token required on every /api/v1/admin/* endpoint.",
    )

    cors_origins: list[str] = ["http://localhost:3000"]

    embedding_dimensions: int = 1536

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
