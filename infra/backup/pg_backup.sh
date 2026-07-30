#!/usr/bin/env bash
# Compressed pg_dump into ./backups, with rotation.
#
# There is no managed-snapshot feature on a self-hosted VPS, so this is the
# whole backup story. Run it from cron:
#
#   0 3 * * * cd /opt/geo-audit && ./infra/backup/pg_backup.sh >> /var/log/geo-backup.log 2>&1
#
# A backup you have never restored is a hypothesis, not a backup - see
# pg_restore.sh and the README's restore drill.
set -euo pipefail

cd "$(dirname "$0")/../.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE="${COMPOSE:-docker compose}"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"

mkdir -p "$BACKUP_DIR"

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
fi

DB_NAME="${POSTGRES_DB:-geo_audit}"
TARGET="${BACKUP_DIR}/${DB_NAME}-${STAMP}.sql.gz"

echo "[$(date -u +%FT%TZ)] Backing up ${DB_NAME} -> ${TARGET}"

# --clean --if-exists makes the dump idempotent to restore over an existing DB.
# -T disables the TTY so the stream is not corrupted by control characters.
$COMPOSE exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
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
