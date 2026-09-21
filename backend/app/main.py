from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="OntoNav",
    description=(
        "Plataforma de Mapeo Ontológico de Decisiones y Diagnóstico Humano. "
        "Analiza entradas de texto/audio a través de 5 ejes ontológicos y "
        "renderiza un árbol de decisiones dinámico, sensible al tiempo."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}
