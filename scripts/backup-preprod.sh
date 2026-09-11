#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — backup the PRE-PROD database
# Streams pg_dump from inside the preprod db container.
# Usage: ./scripts/backup-preprod.sh [output-file]
# ─────────────────────────────────────────────────────────────

set -euo pipefail
source "$(dirname "$0")/common.sh"

require_env_file "preprod"
db_backup "preprod" "${1:-}"