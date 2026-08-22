#!/usr/bin/env bash
# Full backup: a pg_dump of the database plus the attachments directory, packed into
# one portable .tar.gz. Run this from the repo root (same directory as
# docker-compose.yml). Restore steps are in the README.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

BACKUP_DIR="${1:-./backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
STAGING=$(mktemp -d)
trap 'rm -rf "$STAGING"' EXIT

echo "Dumping database..."
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-homeschool}" "${POSTGRES_DB:-homeschool}" \
  > "$STAGING/database.sql"

echo "Copying attachments..."
cp -r ./attachments "$STAGING/attachments"

ARCHIVE="$BACKUP_DIR/homeschool-backup-$TIMESTAMP.tar.gz"
tar -czf "$ARCHIVE" -C "$STAGING" .

echo "Backup written to $ARCHIVE"
