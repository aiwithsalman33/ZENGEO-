"""Application configuration.

Every tunable comes from the environment (see `.env.example`). Nothing is
hardcoded, and the settings object is the single place secrets are read.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "test", "production"]

_RATE_LIMIT_RE = re.compile(r"^\s*(\d+)\s*/\s*(\d*)\s*(second|minute|hour|day)s?\s*$")

_WINDOW_SECONDS = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}


def parse_rate_limit(spec: str) -> tuple[int, int]:
    """Turn ``"10/15minutes"`` into ``(10, 900)`` - (max requests, window seconds)."""
    match = _RATE_LIMIT_RE.match(spec)
    if not match:
        raise ValueError(
            f"Invalid rate limit {spec!r}; expected e.g. '10/minute' or '10/15minutes'"
        )
    limit, multiple, unit = match.groups()
    return int(limit), int(multiple or 1) * _WINDOW_SECONDS[unit]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Core ---
    environment: Environment = "development"
    frontend_url: str = "http://localhost:8080"
    cors_origins: str = "http://localhost:8080,http://localhost:5173"
    api_prefix: str = "/api/v1"

    # --- Secrets ---
    jwt_secret_key: SecretStr = SecretStr("insecure-development-secret-change-me")
    encryption_key: SecretStr = SecretStr("")

    # --- Database ---
    postgres_user: str = "geo_app"
    postgres_password: SecretStr = SecretStr("postgres")
    postgres_db: str = "geo_audit"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    app_db_user: str | None = None
    app_db_password: SecretStr | None = None
    database_url_override: str | None = None

    # --- Redis ---
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    # --- Auth ---
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 14
    login_max_attempts: int = 5
    login_lockout_seconds: int = 900
    require_email_verification: bool = True
    email_token_ttl_hours: int = 24
    password_reset_ttl_minutes: int = 60

    # --- First admin ---
    first_admin_email: str = "admin@example.com"
    first_admin_password: SecretStr = SecretStr("")
    first_admin_name: str = "Platform Admin"

    # --- Email ---
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_starttls: bool = True
    smtp_from: str = "GEO Audit <no-reply@example.com>"

    # --- Audit engine ---
    reports_dir: str = "/data/reports"
    fetch_timeout_seconds: float = 15.0
    fetch_max_bytes: int = 3_000_000
    max_pages_per_audit: int = 8
    allow_private_network_fetch: bool = False
    user_agent: str = "GEO-Audit-Bot/1.0 (+https://github.com/; automated site audit)"

    # --- Share of Voice: stability safeguards, NOT usage caps ---
    sov_provider_concurrency: int = 3
    sov_request_timeout_seconds: float = 120.0
    sov_max_retries: int = 2

    # --- Rate limits ---
    rate_limit_login: str = "10/15minutes"
    rate_limit_signup: str = "5/hour"
    rate_limit_password_reset: str = "5/hour"
    rate_limit_audit_start: str = "20/hour"
    rate_limit_default: str = "300/minute"

    # --- Logging ---
    log_level: str = "INFO"
    log_format: Literal["json", "console"] = "console"

    @field_validator("cors_origins")
    @classmethod
    def _reject_wildcard_origin(cls, value: str) -> str:
        if "*" in value:
            raise ValueError(
                "CORS_ORIGINS must be an explicit allow-list; '*' is incompatible "
                "with credentialed requests."
            )
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    def _dsn(self, user: str, password: str, driver: str) -> str:
        from urllib.parse import quote_plus

        return (
            f"postgresql+{driver}://{quote_plus(user)}:{quote_plus(password)}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url(self) -> str:
        """Async DSN used by the API and worker (least-privilege runtime role)."""
        if self.database_url_override:
            return self.database_url_override
        if self.app_db_user and self.app_db_password:
            return self._dsn(
                self.app_db_user, self.app_db_password.get_secret_value(), "asyncpg"
            )
        return self._dsn(
            self.postgres_user, self.postgres_password.get_secret_value(), "asyncpg"
        )

    @property
    def migration_database_url(self) -> str:
        """Sync DSN used by Alembic - runs as the schema owner, not the app role."""
        return self._dsn(
            self.postgres_user, self.postgres_password.get_secret_value(), "psycopg"
        )

    def validate_for_production(self) -> list[str]:
        """Return a list of unsafe-for-production configuration problems."""
        problems: list[str] = []
        if not self.is_production:
            return problems
        if "change-me" in self.jwt_secret_key.get_secret_value():
            problems.append("JWT_SECRET_KEY is still the placeholder value")
        if len(self.jwt_secret_key.get_secret_value()) < 32:
            problems.append("JWT_SECRET_KEY must be at least 32 characters")
        if not self.encryption_key.get_secret_value():
            problems.append("ENCRYPTION_KEY is required to store BYOK API keys")
        if "change-me" in self.postgres_password.get_secret_value():
            problems.append("POSTGRES_PASSWORD is still the placeholder value")
        if self.allow_private_network_fetch:
            problems.append(
                "ALLOW_PRIVATE_NETWORK_FETCH must be false in production (SSRF risk)"
            )
        if self.frontend_url.startswith("http://"):
            problems.append("FRONTEND_URL must use https in production")
        return problems


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
