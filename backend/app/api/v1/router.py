from fastapi import APIRouter

from app.api.v1 import admin, analyze, graph, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(users.router)
api_router.include_router(analyze.router)
api_router.include_router(admin.router)
api_router.include_router(graph.router)
