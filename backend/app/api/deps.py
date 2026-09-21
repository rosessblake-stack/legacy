from collections.abc import AsyncGenerator
from functools import lru_cache

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import AsyncSessionFactory
from app.services.graph_service import GraphBuilder
from app.services.guardrail_service import SocraticGuardrail
from app.services.llm_factory import get_chat_model
from app.services.ontology_service import OntologyAnalysisService
from app.services.speech_service import SpeechTranscriptionService


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


def get_app_settings() -> Settings:
    return get_settings()


@lru_cache
def _guardrail_singleton() -> SocraticGuardrail:
    settings = get_settings()
    return SocraticGuardrail(get_chat_model(settings))


def get_guardrail() -> SocraticGuardrail:
    return _guardrail_singleton()


@lru_cache
def _ontology_service_singleton() -> OntologyAnalysisService:
    settings = get_settings()
    return OntologyAnalysisService(get_chat_model(settings), _guardrail_singleton())


def get_ontology_service() -> OntologyAnalysisService:
    return _ontology_service_singleton()


def get_graph_builder(guardrail: SocraticGuardrail = Depends(get_guardrail)) -> GraphBuilder:
    return GraphBuilder(guardrail)


def get_speech_service(settings: Settings = Depends(get_app_settings)) -> SpeechTranscriptionService:
    return SpeechTranscriptionService(settings)


async def require_admin(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_app_settings),
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token.")
    token = authorization.removeprefix("Bearer ").strip()
    if token != settings.admin_api_key:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid admin credentials.")
    return token
