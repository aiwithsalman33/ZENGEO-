#!/usr/bin/env bash
# Compressed pg_dump of the managed database into ./backups, with rotation.
#
# CHECK YOUR PROVIDER FIRST. Most managed Postgres services already take
# automated snapshots with point-in-time recovery, which is strictly better than
# this script: no cron to fail silently, and a recovery granularity of seconds
# rather than a day. If yours does, enable it and DO NOT schedule this - a second
# backup system nobody watches is a liability. Run this only when the provider
# has no snapshot feature, or when you want an off-provider copy you control.
#
#   0 3 * * * cd /opt/checkgeo && ./infra/backup/pg_backup.sh >> /var/log/checkgeo-backup.log 2>&1
#
# A backup you have never restored is a hypothesis, not a backup - see
# pg_restore.sh and the README's restore drill.
set -euo pipefail

cd "$(dirname "$0")/../.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE="${COMPOSE:-docker compose}"
# Must be >= the managed server's major version; pg_dump refuses to dump a newer
# server than itself.
PG_IMAGE="${PG_IMAGE:-postgres:16-alpine}"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"

mkdir -p "$BACKUP_DIR"

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
fi

DB_NAME="${POSTGRES_DB:-geo_audit}"
TARGET="${BACKUP_DIR}/${DB_NAME}-${STAMP}.sql.gz"

# There is no local postgres container any more, so the dump runs from a
# throwaway client container pointed at the managed host. The owner role is used
# because the runtime role deliberately cannot read everything.
: "${POSTGRES_HOST:?POSTGRES_HOST is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
DUMP_DSN="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${DB_NAME}?sslmode=${POSTGRES_SSLMODE:-require}"

echo "[$(date -u +%FT%TZ)] Backing up ${DB_NAME} on ${POSTGRES_HOST} -> ${TARGET}"

# --clean --if-exists makes the dump idempotent to restore over an existing DB.
# The DSN goes in via the environment, never argv, so it cannot be read out of
# `ps` by another user on the box.
docker run --rm -i -e PGDSN="$DUMP_DSN" "$PG_IMAGE" \
  sh -c 'pg_dump "$PGDSN" --clean --if-exists' \
  | gzip -9 > "$TARGET.partial"

# Only publish the final name once the dump completed, so a half-written file
# from an interrupted run is never mistaken for a good backup.
mv "$TARGET.partial" "$TARGET"

SIZE="$(du -h "$TARGET" | cut -f1)"
echo "[$(date -u +%FT%TZ)] Wrote ${TARGET} (${SIZE})"

# Refuse to keep an obviously empty dump around.
if [ "$(gzip -dc "$TARGET" | head -c 100 | wc -c)" -lt 50 ]; then
  echo "ERROR: dump looks empty - keeping it for inspection but treat it as failed" >&2
  exit 1
fi

echo "Pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete

# Reports live on a Docker volume, not in Postgres, so they need their own copy.
if [ "${BACKUP_REPORTS:-true}" = "true" ]; then
  REPORTS_TARGET="${BACKUP_DIR}/reports-${STAMP}.tar.gz"
  echo "[$(date -u +%FT%TZ)] Backing up stored PDF reports -> ${REPORTS_TARGET}"
  $COMPOSE exec -T backend tar -czf - -C /data reports > "$REPORTS_TARGET.partial" 2>/dev/null || true
  if [ -s "$REPORTS_TARGET.partial" ]; then
    mv "$REPORTS_TARGET.partial" "$REPORTS_TARGET"
    find "$BACKUP_DIR" -name 'reports-*.tar.gz' -type f -mtime "+${RETENTION_DAYS}" -delete
  else
    rm -f "$REPORTS_TARGET.partial"
    echo "No reports to back up yet"
  fi
fi

echo "[$(date -u +%FT%TZ)] Backup complete"
echo
echo "Copy backups off this machine - a backup on the same disk as the database"
echo "does not survive the failure it exists for. rsync/rclone to object storage"
echo "or another host as a second cron step."
