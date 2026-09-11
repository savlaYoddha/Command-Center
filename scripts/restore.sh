#!/usr/bin/env bash
# COMMANDCENTER — PostgreSQL Restore Script
# Restores a database from a pg_dump backup file.
#
# Usage:
#   ./scripts/restore.sh backups/commandcenter-YYYYMMDD-HHMMSS.sql
#
# ⚠️  This will DROP and recreate all tables in the target database.
#
# Environment:
#   DATABASE_URL — PostgreSQL connection string (required)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load .env if present
if [[ -f "$ROOT/.env" ]]; then
  set -a; source "$ROOT/.env"; set +a
fi

ARCHIVE="${1:-}"
if [[ -z "$ARCHIVE" ]]; then
  echo "Usage: ./scripts/restore.sh backups/commandcenter-YYYYMMDD-HHMMSS.sql" >&2
  exit 1
fi

if [[ ! -f "$ARCHIVE" ]]; then
  echo "Error: File not found: $ARCHIVE" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set." >&2
  echo "Set it in .env or export it before running this script." >&2
  exit 1
fi

echo "⚠️  This will DROP and recreate all tables in the target database."
echo "   Target: ${DATABASE_URL%%@*}@***"
echo "   Source: $ARCHIVE"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Restoring from $ARCHIVE..."
psql "$DATABASE_URL" -f "$ARCHIVE" --set ON_ERROR_STOP=1

echo ""
echo "✓ Restore complete from $ARCHIVE"
