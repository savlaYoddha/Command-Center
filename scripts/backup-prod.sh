#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — backup the PROD database
# Streams pg_dump from inside the prod db container.
# Usage: ./scripts/backup-prod.sh [output-file]
# ─────────────────────────────────────────────────────────────

set -euo pipefail
source "$(dirname "$0")/common.sh"

require_env_file "prod"
db_backup "prod" "${1:-}"