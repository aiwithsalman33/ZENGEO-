"""FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware, SecurityHeadersMiddleware
from app.core.redis_client import close_redis

configure_logging(settings.log_level, settings.log_format)
log = get_logger("startup")


@asynccontextmanager
async def lifespan(_app: FastAPI):  # type: ignore[no-untyped-def]
    problems = settings.validate_for_production()
    if problems:
        # Refuse to boot a production deployment with placeholder secrets.
        for problem in problems:
            log.error("insecure_production_config", problem=problem)
        raise RuntimeError(
            "Refusing to start in production with insecure configuration: "
            + "; ".join(problems)
        )
    log.info("application_start", environment=settings.environment)
    yield
    await close_redis()
    log.info("application_stop")


def create_app() -> FastAPI:
    docs_url = None if settings.is_production else "/docs"
    app = FastAPI(
        title="GEO Audit API",
        version="1.0.0",
        description=(
            "Audits how visible and citable a business is inside AI-generated "
            "answers, and scores it 0-100 across seven weighted pillars."
        ),
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )

    # Order matters: the outermost middleware is added last.
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,  # explicit allow-list, never "*"
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-CSRF-Token", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )
    app.add_middleware(RequestContextMiddleware)

    app.include_router(api_router)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Never leak a stack trace or internal message to a client."""
        log.exception("unhandled_exception", path=request.url.path, error=type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": getattr(request.state, "request_id", None),
            },
        )

    return app


app = create_app()
