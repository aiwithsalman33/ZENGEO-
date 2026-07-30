"""Transactional email.

If ``SMTP_HOST`` is unset the console backend is used: the message (including
the verification or reset link) is written to the application log instead of
being sent. That keeps local development and CI self-contained.
"""

from __future__ import annotations

from email.message import EmailMessage
from pathlib import Path

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("email")

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"

_env = Environment(
    loader=FileSystemLoader(_TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"]),  # escapes user-supplied names
    trim_blocks=True,
    lstrip_blocks=True,
)


def _render(template: str, **context: object) -> str:
    return _env.get_template(template).render(
        frontend_url=settings.frontend_url.rstrip("/"), **context
    )


async def send_email(*, to: str, subject: str, html: str, text: str) -> bool:
    """Send one message. Returns True if delivered (or logged in console mode)."""
    if not settings.smtp_host:
        log.info(
            "email_console_backend",
            to=to,
            subject=subject,
            body=text,
            note="SMTP_HOST is not configured; message logged instead of sent.",
        )
        return True

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    message.add_alternative(html, subtype="html")

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=(settings.smtp_password.get_secret_value() or None),
            start_tls=settings.smtp_starttls,
            timeout=20,
        )
        log.info("email_sent", to=to, subject=subject)
        return True
    except Exception as exc:
        # A mail outage must not fail the surrounding request (e.g. signup).
        log.error("email_send_failed", to=to, subject=subject, error=str(exc))
        return False


async def send_verification_email(*, to: str, name: str | None, token: str) -> bool:
    link = f"{settings.frontend_url.rstrip('/')}/verify-email?token={token}"
    return await send_email(
        to=to,
        subject="Confirm your email — CheckGEO.ai",
        html=_render("verify_email.html", name=name or "there", link=link),
        text=(
            f"Hi {name or 'there'},\n\n"
            "Confirm your email address to start running GEO audits:\n"
            f"{link}\n\n"
            f"The link expires in {settings.email_token_ttl_hours} hours.\n"
            "If you did not create this account you can ignore this message."
        ),
    )


async def send_password_reset_email(*, to: str, name: str | None, token: str) -> bool:
    link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
    return await send_email(
        to=to,
        subject="Reset your password — CheckGEO.ai",
        html=_render("reset_password.html", name=name or "there", link=link),
        text=(
            f"Hi {name or 'there'},\n\n"
            "Use this link to choose a new password:\n"
            f"{link}\n\n"
            f"The link expires in {settings.password_reset_ttl_minutes} minutes and "
            "can only be used once.\n"
            "If you did not request this, no action is needed - your password is unchanged."
        ),
    )


async def send_audit_complete_email(
    *, to: str, name: str | None, business: str, score: float, band: str, audit_id: str
) -> bool:
    link = f"{settings.frontend_url.rstrip('/')}/app/audits/{audit_id}"
    return await send_email(
        to=to,
        subject=f"Your GEO audit for {business} is ready — score {score:.0f}/100",
        html=_render(
            "audit_complete.html",
            name=name or "there",
            business=business,
            score=f"{score:.0f}",
            band=band,
            link=link,
        ),
        text=(
            f"Hi {name or 'there'},\n\n"
            f"The GEO audit for {business} finished.\n"
            f"Overall score: {score:.0f}/100 ({band})\n\n"
            f"Full report: {link}\n"
        ),
    )
