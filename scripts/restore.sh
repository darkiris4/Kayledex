#!/usr/bin/env bash
# Restores a backup created by backup.sh. DESTRUCTIVE: drops and recreates the
# database, and replaces the attachments directory, before restoring from the archive.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

ARCHIVE="${1:?Usage: scripts/restore.sh <path-to-backup.tar.gz>}"

if [ ! -f "$ARCHIVE" ]; then
  echo "Backup file not found: $ARCHIVE" >&2
  exit 1
fi

read -r -p "This will REPLACE the current database and attachments. Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

STAGING=$(mktemp -d)
trap 'rm -rf "$STAGING"' EXIT

echo "Extracting archive..."
tar -xzf "$ARCHIVE" -C "$STAGING"

echo "Stopping the app so it can't hold a connection open against the database we're about to drop..."
docker compose stop app

echo "Restoring database (dropping and recreating first)..."
docker compose exec -T postgres psql -U "${POSTGRES_USER:-homeschool}" -d postgres \
  -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB:-homeschool}\";" \
  -c "CREATE DATABASE \"${POSTGRES_DB:-homeschool}\";"
docker compose exec -T postgres psql -U "${POSTGRES_USER:-homeschool}" "${POSTGRES_DB:-homeschool}" \
  < "$STAGING/database.sql"

echo "Restoring attachments..."
rm -rf ./attachments
cp -r "$STAGING/attachments" ./attachments

echo "Restore complete. Starting the app back up..."
docker compose up -d app
