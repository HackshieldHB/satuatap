#!/usr/bin/env bash
# Postgres backup for the SATU ATAP VPS deployment.
#
# Dumps the dockerized Postgres to a timestamped, gzipped file and prunes old
# ones. Intended to run on the VPS from cron. Install (as root) with:
#
#   chmod +x /opt/satuatap/scripts/backup-db.sh
#   ( crontab -l 2>/dev/null; echo "15 3 * * * /opt/satuatap/scripts/backup-db.sh >> /var/log/satuatap-backup.log 2>&1" ) | crontab -
#
# Restore a dump with:
#   gunzip -c <file>.sql.gz | docker exec -i <postgres-container> psql -U satuatap -d satuatap
#
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/satuatap/backups}"
DB_USER="${DB_USER:-satuatap}"
DB_NAME="${DB_NAME:-satuatap}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Locate the running Postgres container (compose names it *postgres*).
CONTAINER="$(docker ps --format '{{.Names}}' | grep -m1 postgres || true)"
if [ -z "$CONTAINER" ]; then
  echo "[backup] no running postgres container found" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/satuatap-$STAMP.sql.gz"

echo "[backup] dumping $DB_NAME from $CONTAINER -> $OUT"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$OUT"

# Fail loudly if the dump came out suspiciously small (e.g. auth error).
SIZE="$(stat -c%s "$OUT" 2>/dev/null || echo 0)"
if [ "$SIZE" -lt 1000 ]; then
  echo "[backup] dump looks too small ($SIZE bytes) — check credentials" >&2
  exit 1
fi

echo "[backup] ok ($SIZE bytes). pruning backups older than ${RETENTION_DAYS}d"
find "$BACKUP_DIR" -name 'satuatap-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] done"
