#!/usr/bin/env bash
# COMMANDCENTER — PostgreSQL Backup Script
# Creates a timestamped pg_dump backup of the commandcenter database.
#
# Usage:
#   ./scripts/backup.sh                     # auto-named backup in ./backups/
#   ./scripts/backup.sh /path/to/file.sql   # custom output path
#
# Environment:
#   DATABASE_URL — PostgreSQL connection string (required)
#   BACKUP_DIR  — Backup directory (default: ./backups)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load .env if present
if [[ -f "$ROOT/.env" ]]; then
  set -a; source "$ROOT/.env"; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set." >&2
  echo "Set it in .env or export it before running this script." >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
DEST="${1:-$BACKUP_DIR/commandcenter-$STAMP.sql}"
mkdir -p "$(dirname "$DEST")"

echo "Backing up COMMANDCENTER database..."
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  -f "$DEST"

echo "Backup written to $DEST"
echo "Size: $(du -h "$DEST" | cut -f1)"
