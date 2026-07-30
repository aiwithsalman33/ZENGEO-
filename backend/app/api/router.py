"""Aggregates every versioned API router."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import auth, health, llm_keys, users
from app.core.config import settings

api_router = APIRouter()

# Health lives outside the version prefix so orchestrators can hit /health.
api_router.include_router(health.router)

v1 = APIRouter(prefix=settings.api_prefix)
v1.include_router(auth.router)
v1.include_router(users.router)
v1.include_router(llm_keys.router)

api_router.include_router(v1)
