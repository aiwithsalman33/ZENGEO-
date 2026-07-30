# GEO Audit

A self-hosted web app that scores how visible and citable a business is inside
AI-generated answers — ChatGPT, Claude, Perplexity — and produces a report with
prioritised fixes.

Users bring their own LLM API keys. Keys are encrypted at rest, used only for
that user's own audits, and never billed centrally, which is what keeps the tool
free and keeps anyone from imposing a limit on how much a user tests.

---

## Contents

- [What it measures](#what-it-measures)
- [Quick start (local)](#quick-start-local)
- [First admin](#first-admin)
- [Connecting an AI provider key](#connecting-an-ai-provider-key)
- [Deploying to a VPS](#deploying-to-a-vps)
- [Backups and restore](#backups-and-restore)
- [Everyday commands](#everyday-commands)
- [Architecture](#architecture)
- [Security notes](#security-notes)
- [Adding a new AI provider](#adding-a-new-ai-provider)
- [Troubleshooting](#troubleshooting)

---

## What it measures

The GEO score is a 0–100 composite of seven weighted pillars. Each is scored
0–100 on its own, then combined by weight.

| # | Pillar | Weight | What it checks |
|---|--------|--------|----------------|
| 1 | Crawlability & AI bot access | 15% | Whether GPTBot, ClaudeBot, PerplexityBot, Google-Extended and CCBot are allowed; whether pages return real content without JavaScript; sitemap; HTTPS |
| 2 | llms.txt brand file | 10% | Presence, MIME type, spec structure, `llms-full.txt`, robots reference, smart-typography characters |
| 3 | Structured data | 15% | Organization / Product / FAQPage / Article JSON-LD, scored on presence *and* field completeness |
| 4 | Content extractability | 20% | Heading hierarchy, a direct answer in the first 200 words, lists and tables, paragraph length, quotable numeric claims |
| 5 | Evidence & E-E-A-T | 15% | Statistics, outbound citations, quotes, bylines, content freshness, vague superlatives |
| 6 | Entity authority | 10% | Live Wikidata lookup, `sameAs` profiles, name/address/phone consistency, third-party mentions |
| 7 | **AI Share of Voice** | 15% | Your own target prompts sent to the assistants you connected, checked for mentions, citations, position and which competitors appeared instead |

**Bands:** 0–39 Poor · 40–59 Needs Work · 60–79 Good · 80–100 Excellent.

**If no API key is connected**, pillar 7 is skipped and its 15% is redistributed
proportionally across the other six, so the score stays on a true 0–100 scale
rather than being silently capped at 85. The report says so explicitly.

---

## Quick start (local)

Requirements: Docker and Docker Compose. Nothing else.

```bash
git clone <your-repo-url> geo-audit
cd geo-audit
```

**1. Create `.env` with generated secrets.**

```bash
cp .env.example .env          # then fill in the secrets, or:
./geo.ps1 init                # Windows: generates all secrets for you
make secrets                  # Linux/macOS: prints values to paste in
```

Three secrets must be unique per environment:

| Variable | Generate with |
|---|---|
| `JWT_SECRET_KEY` | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `POSTGRES_PASSWORD` / `APP_DB_PASSWORD` | `openssl rand -base64 24` |

> **`ENCRYPTION_KEY` is not rotatable in place.** It encrypts every stored API
> key. If you lose it, users must re-enter their keys. Back it up somewhere
> separate from the database. To rotate, put the new key in `ENCRYPTION_KEY` and
> the old one in `ENCRYPTION_KEY_FALLBACKS` (comma-separated) so existing
> records still decrypt while they are re-saved.

**2. Start everything.**

```bash
docker compose up -d --build     # or: make up / .\geo.ps1 up
```

**3. Apply migrations.**

```bash
docker compose exec backend alembic upgrade head    # make migrate
```

**4. Open <http://localhost:8080>.**

The API docs are at <http://localhost:8080/docs> in development (disabled
automatically when `ENVIRONMENT=production`).

Local development runs everything behind Caddy on one origin, which matters:
the refresh cookie is `SameSite=Strict` and path-scoped, so hitting the Vite
dev server on `:5173` directly means sessions will not survive a reload.

---

## First admin

There is no way to sign up as an administrator — the signup endpoint rejects a
`role` field outright. The first admin is seeded from `.env`:

```bash
# Set FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD in .env first
docker compose exec backend python -m app.scripts.seed_admin   # make seed-admin
```

It is idempotent: run it again and it promotes the existing account rather than
failing, and it never overwrites a password.

Then sign in at the normal `/login` page — there is one login page for everyone,
and the role in the response decides whether you land on `/app` or `/admin`.
Further admins are promoted from **Admin → Users**.

---

## Connecting an AI provider key

Share of Voice — the pillar that actually tests whether assistants mention you —
runs on the user's own key.

1. Sign in and go to **Settings → API keys**.
2. Choose a provider, paste the key, optionally name a model.
3. Save. The key is verified against the provider *before* it is stored, using a
   free metadata endpoint where one exists (OpenAI and Anthropic), so checking a
   key costs nothing.

| Provider | Where to get a key | Notes |
|---|---|---|
| OpenAI | <https://platform.openai.com/api-keys> | Answers come from model knowledge; citations are whatever URLs appear in the text |
| Anthropic | <https://console.anthropic.com/settings/keys> | Can answer with live web search — enable it for comparable citation rates |
| Perplexity | <https://www.perplexity.ai/settings/api> | Always web-grounded and always returns citations |

**Citation rates only compare fairly between web-grounded providers**, which is
why the report labels each answer with whether it was grounded.

There is **no cap** on how many target prompts or providers a single audit uses.
The wizard shows `prompts × providers = planned API calls` before you start so
the spend is visible; calls are queued with a per-provider concurrency limit,
which exists so one large audit cannot trip a provider's rate limit — it is not
a usage restriction.

---

## Deploying to a VPS

Designed for one box running Docker Compose. No managed services required.

### Sizing

| Users | vCPU | RAM | Disk |
|---|---|---|---|
| Evaluation / single team | 2 | 4 GB | 20 GB |
| Small production (tens of users) | 4 | 8 GB | 40 GB |
| Busy (many concurrent audits) | 4–8 | 16 GB | 80 GB+ |

**RAM is the binding constraint.** Postgres, Redis, the API and the frontend are
modest; the worker is not — WeasyPrint holds a whole document in memory, and
Argon2id is deliberately memory-hard at 64 MiB per password verification. Below
4 GB the worker is the first thing the OOM killer takes.

Disk grows with stored PDF reports (~50–150 KB each) and Postgres.

### First deploy

```bash
# On the VPS
git clone <your-repo-url> /opt/geo-audit
cd /opt/geo-audit

cp .env.example .env
# Edit .env: set ENVIRONMENT=production, PUBLIC_DOMAIN, ACME_EMAIL,
# FRONTEND_URL=https://your-domain, CORS_ORIGINS=https://your-domain,
# and freshly generated secrets.

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend alembic upgrade head
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python -m app.scripts.seed_admin
```

Point an A record at the VPS **before** the first start — Caddy obtains a Let's
Encrypt certificate on boot and needs the domain to resolve.

The app refuses to start in production with placeholder secrets, a plain-HTTP
`FRONTEND_URL`, or `ALLOW_PRIVATE_NETWORK_FETCH=true`. That is deliberate: those
are the mistakes worth failing loudly on.

### Firewall

Only the proxy is exposed. Postgres and Redis have no `ports:` entry in the
production compose file, so they are reachable only on the internal Docker
network.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp        # SSH - restrict to your own IP if you can
ufw allow 80/tcp        # required for Let's Encrypt challenges
ufw allow 443/tcp
ufw allow 443/udp       # HTTP/3
ufw enable
```

Do **not** open 5432 or 6379. If you need psql access, tunnel it:
`ssh -L 5432:localhost:5432 user@vps` after temporarily publishing the port, or
just use `docker compose exec postgres psql`.

### Updating

```bash
cd /opt/geo-audit
./infra/backup/pg_backup.sh        # back up before you change anything
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## Backups and restore

There is no managed snapshot on a self-hosted box, so this is the whole backup
story.

```bash
crontab -e
# Nightly at 03:00
0 3 * * * cd /opt/geo-audit && ./infra/backup/pg_backup.sh >> /var/log/geo-backup.log 2>&1
```

The script writes a compressed `pg_dump` plus a tarball of stored PDF reports
into `./backups`, prunes anything older than `RETENTION_DAYS` (default 14), and
only publishes the final filename once the dump completes — so an interrupted
run cannot leave a half-written file that looks like a good backup.

**Copy backups off the machine.** A backup on the same disk as the database does
not survive the failure it exists for. Add a second cron step with `rclone` or
`rsync` to object storage or another host.

### Restore drill — do this before you need it

```bash
./infra/backup/pg_restore.sh backups/geo_audit-2026-07-30T03-00-00Z.sql.gz
```

It stops the backend and worker first (restoring under live traffic gives a torn
result), restores, restarts, and applies any migrations newer than the dump.

Practise on a throwaway copy. An untested restore path is the usual reason a
backup turns out not to be one.

---

## Everyday commands

Two runners are provided — `make` for Linux/macOS/VPS, `geo.ps1` for Windows.

| Task | Make | PowerShell |
|---|---|---|
| Start dev stack | `make up` | `.\geo.ps1 up` |
| Stop | `make down` | `.\geo.ps1 down` |
| Tail logs | `make logs S=backend` | `.\geo.ps1 logs backend` |
| Migrate | `make migrate` | `.\geo.ps1 migrate` |
| New migration | `make revision M="add x"` | `.\geo.ps1 revision "add x"` |
| Seed admin | `make seed-admin` | `.\geo.ps1 seed-admin` |
| Tests | `make test` | `.\geo.ps1 test` |
| Lint + types | `make lint` | `.\geo.ps1 lint` |
| Dependency audit | `make audit` | `.\geo.ps1 audit` |
| psql | `make psql` | `.\geo.ps1 psql` |
| Backup | `make backup` | `.\geo.ps1 backup` |
| Production up | `make prod-up` | `.\geo.ps1 prod-up` |

---

## Architecture

```
Browser ──HTTPS──> Caddy ──┬──> /api/*  ──> FastAPI (backend)
                           └──> /*      ──> nginx (built SPA)
                                              │
                            Postgres 16 ──────┤
                            Redis ────────────┤
                            Celery worker ────┘   (audits, Share of Voice, PDFs)
```

- **Backend** — Python 3.12, FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2.
- **Frontend** — TypeScript, React 18, Vite, Tailwind, TanStack Query, Recharts.
- **Worker** — Celery. Audits fetch many external pages and can make a large
  number of LLM calls, so they never run inside a request.
- **Proxy** — Caddy rather than Nginx: on a single VPS it gets automatic
  Let's Encrypt certificates with three lines of config and renews them itself.

Caddy is the only container that publishes ports.

---

## Security notes

Implemented, not aspirational — most of these have tests.

**Authentication**
- Argon2id password hashing (64 MiB, the hybrid variant), with automatic rehash
  when parameters are strengthened.
- Short-lived JWT access tokens in memory; the refresh token is an httpOnly,
  `Secure`, `SameSite=Strict`, path-scoped cookie that JavaScript cannot read.
- Refresh-token rotation with **reuse detection**: replaying a rotated token
  revokes the entire token family, because a replay means a copy leaked.
- CSRF double-submit on the cookie-authenticated endpoints, on top of SameSite.
- Per-IP *and* per-account rate limits on login, so a botnet rotating IPs still
  cannot grind one account. Exponential account lockout.
- Identical responses for "no such user" and "wrong password", and for password
  reset whether or not the address exists — no account enumeration.

**BYOK API keys**
- Encrypted with Fernet before insert; decrypted only in memory, inside the
  process making that user's own call.
- Never logged (the log pipeline redacts secret-shaped keys), never returned
  after creation, not visible to administrators, not included in data exports.
- Deleting a key is a hard delete, not a flag.

**SSRF** — the engine fetches URLs users type, from inside our network:
- Scheme and port allow-lists.
- Every address a hostname resolves to is checked; one public and one private
  record is rejected, not tolerated.
- The address actually connected to is re-checked after the socket opens, which
  closes the DNS-rebinding race a pre-flight lookup alone cannot win.
- Redirects are followed manually so every hop is revalidated.
- Response bodies are size-capped while streaming.

**Other**
- Postgres runs with two roles: Alembic migrates as the schema owner, the app
  connects as a DML-only role that cannot create, alter or drop objects.
- Security headers (CSP, HSTS in production, `X-Frame-Options: DENY`, nosniff,
  Referrer-Policy) set by both the app and the proxy, so the API is still
  protected if ever exposed without the proxy.
- CORS is an explicit allow-list; the config refuses to accept `*`.
- Containers run as non-root, with read-only root filesystems, dropped
  capabilities and `no-new-privileges` in production.
- Reports are stored on a private volume and served only through an endpoint
  that re-checks ownership — a non-owner gets 404, not 403, so the response does
  not confirm the audit exists.
- Every state-changing admin action is written to an append-only log with the
  actor, target and a reason.

**Dependencies** — pinned exactly, so they move only when Dependabot opens a PR
and CI goes green on it. Both audits run on every push and weekly on a schedule:
`pip-audit --strict` for Python, and `npm run audit:check` for JavaScript.

`audit:check` is a small gate rather than a bare `npm audit`, because npm offers
only "fail on everything" or "lower the threshold" — and neither is honest. It
fails on every high/critical advisory *except* those in
`frontend/scripts/audit-allowlist.json`, where each entry carries a written
reason it cannot affect this app and a date by which someone must look again.
An exception is a decision that is signed and expires, not a silently raised bar.

There is one such entry today: a React Router advisory affecting **RSC mode**.
This app uses React Router purely as a client-side URL matcher — no
`createBrowserRouter`, no loaders or actions, no server rendering — so the
vulnerable path is not shipped. npm's suggested remediation is a downgrade that
would reintroduce open-redirect CVEs which *are* reachable from `<Link>` and
`useNavigate`, so staying put is the safer position.

To report a vulnerability, open a private security advisory rather than a public
issue.

---

## Adding a new AI provider

The provider layer is a registry. Nothing outside it names a provider, so an
adapter is genuinely all it takes.

1. Create `backend/app/llm/yourprovider.py`:

```python
from app.llm.base import LLMProvider, LLMResponse, ValidationResult, register_provider

@register_provider
class YourProvider(LLMProvider):
    name = "yourprovider"
    display_name = "Your Provider"
    default_model = "their-best-model"
    suggested_models = ("their-best-model", "their-cheap-model")
    key_format_hint = "Starts with yp-"
    docs_url = "https://yourprovider.example/keys"
    supports_web_search = False

    async def validate(self) -> ValidationResult:
        ...   # prefer a free metadata endpoint over a billed completion

    async def ask(self, prompt: str, *, max_tokens: int = 1024) -> LLMResponse:
        ...
```

2. Import it in `backend/app/llm/__init__.py`.
3. Add the value to the `LLMProviderName` enum and generate a migration.

The settings UI, the audit engine, the admin panel and the report all read from
the registry, so they pick it up with no further changes.

---

## Troubleshooting

**Audit stuck on "Queued".** The worker is not consuming. Check
`docker compose logs worker` and that Redis is healthy.

**Audit failed immediately with a crawlability score of 0.** The site was
unreachable, or the SSRF guard refused it. The per-stage event log on the audit
page gives the reason. Auditing a site on your own machine needs
`ALLOW_PRIVATE_NETWORK_FETCH=true`, which only works outside production.

**"Confirm your email before running an audit".** With no SMTP configured, the
verification link is written to the backend log instead of being emailed:

```bash
docker compose logs backend | grep -A3 email_console_backend
```

Set `SMTP_HOST` and friends to send real mail.

**Share of Voice always skipped.** Either no active API key, or no target
prompts in the questionnaire. Both are reported in the skip reason.

**PDF missing but the audit completed.** Report generation failures never fail
the audit — the results are already saved. Check the worker log for
`report_failed`.

**Certificate not issued.** Caddy needs the domain's DNS to resolve to the VPS
and ports 80 and 443 reachable from the internet. `docker compose logs caddy`
shows the ACME error.

**`got Future attached to a different loop` in the worker.** Every Celery task
must dispose the database engine before its event loop closes — use
`run_in_loop()` from `app/worker/tasks.py` rather than bare `asyncio.run`.

---

## Licence

Add the licence you intend to ship under before publishing this repository.
