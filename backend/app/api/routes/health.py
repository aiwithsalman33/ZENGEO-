"""Liveness and readiness probes."""

from __future__ import annotations

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app.core.redis_client import get_redis
from app.db.session import SessionLocal

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness probe")
async def health() -> dict[str, str]:
    """Cheap check: the process is up and serving. Used by Docker healthchecks."""
    return {"status": "ok"}


@router.get("/health/ready", summary="Readiness probe")
async def readiness(response: Response) -> dict[str, object]:
    """Verifies the dependencies an incoming request actually needs."""
    checks: dict[str, str] = {}

    try:
        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"error: {type(exc).__name__}"

    try:
        await get_redis().ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {type(exc).__name__}"

    healthy = all(value == "ok" for value in checks.values())
    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ready" if healthy else "degraded", "checks": checks}
