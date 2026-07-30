# GEO Audit SaaS - task runner.
#
# Windows users without GNU make: use the equivalent PowerShell runner instead,
#   .\geo.ps1 up      .\geo.ps1 migrate      .\geo.ps1 seed-admin

COMPOSE      := docker compose
COMPOSE_PROD := docker compose -f docker-compose.yml -f docker-compose.prod.yml

.DEFAULT_GOAL := help
.PHONY: help secrets up down restart build logs ps migrate revision seed-admin \
        test test-backend test-frontend lint audit shell psql redis-cli \
        backup restore prod-up prod-down prod-logs prod-migrate clean

help: ## Show available commands
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

secrets: ## Print freshly generated values for the three required secrets
	@echo "JWT_SECRET_KEY=$$(openssl rand -hex 32)"
	@echo "ENCRYPTION_KEY=$$(docker run --rm python:3.12-slim python -c \
		'from cryptography.fernet import Fernet' 2>/dev/null \
		|| python -c 'import base64,os;print(base64.urlsafe_b64encode(os.urandom(32)).decode())')"
	@echo "POSTGRES_PASSWORD=$$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
	@echo "APP_DB_PASSWORD=$$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"

up: ## Start the dev stack (hot reload) at http://localhost:8080
	$(COMPOSE) up -d --build
	@echo "App:  http://localhost:8080"
	@echo "Docs: http://localhost:8080/docs"

down: ## Stop the dev stack
	$(COMPOSE) down

restart: ## Restart backend and worker
	$(COMPOSE) restart backend worker

build: ## Rebuild all images
	$(COMPOSE) build

logs: ## Tail logs (make logs S=backend for one service)
	$(COMPOSE) logs -f --tail=120 $(S)

ps: ## Show container status
	$(COMPOSE) ps

migrate: ## Apply database migrations
	$(COMPOSE) exec backend alembic upgrade head

revision: ## Autogenerate a migration: make revision M="add widgets"
	$(COMPOSE) exec backend alembic revision --autogenerate -m "$(M)"

seed-admin: ## Create/promote the first admin from FIRST_ADMIN_* in .env
	$(COMPOSE) exec backend python -m app.scripts.seed_admin

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests (pytest)
	$(COMPOSE) exec backend pytest -q

test-frontend: ## Run frontend tests (vitest)
	$(COMPOSE) exec frontend npm run test

lint: ## Lint and type-check both sides
	$(COMPOSE) exec backend ruff check app tests
	$(COMPOSE) exec backend mypy app
	$(COMPOSE) exec frontend npm run typecheck

audit: ## Dependency vulnerability scan
	$(COMPOSE) exec backend pip-audit --strict --requirement requirements.txt
	$(COMPOSE) exec frontend npm run audit:check

shell: ## Shell inside the backend container
	$(COMPOSE) exec backend bash

psql: ## psql session against the app database
	$(COMPOSE) exec postgres sh -c 'PGPASSWORD="$$POSTGRES_PASSWORD" psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

redis-cli: ## redis-cli session
	$(COMPOSE) exec redis redis-cli

backup: ## Take a compressed pg_dump into ./backups
	./infra/backup/pg_backup.sh

restore: ## Restore from a dump: make restore F=backups/geo_audit-2026-07-30.sql.gz
	./infra/backup/pg_restore.sh $(F)

prod-up: ## Start the production stack on the VPS
	$(COMPOSE_PROD) up -d --build

prod-down: ## Stop the production stack
	$(COMPOSE_PROD) down

prod-logs: ## Tail production logs
	$(COMPOSE_PROD) logs -f --tail=120 $(S)

prod-migrate: ## Apply migrations in production
	$(COMPOSE_PROD) exec backend alembic upgrade head

clean: ## Stop everything and DELETE all volumes (destroys the database)
	@printf "This deletes the database, Redis data and stored PDF reports. Type 'yes' to continue: " \
		&& read ans && [ "$$ans" = "yes" ] && $(COMPOSE) down -v || echo "Aborted."
