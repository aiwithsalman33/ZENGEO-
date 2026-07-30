"""Celery task definitions. Implementations land in phases 7-10."""

from __future__ import annotations

from app.worker.celery_app import celery_app


@celery_app.task(name="geo.ping")
def ping() -> str:
    """Smoke test that the worker can accept and complete a task."""
    return "pong"
