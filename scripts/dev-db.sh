#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — local development database (PostgreSQL via Docker)
# Starts ONLY the dev database on host port 5433. The app itself
# runs on the host with hot reload: `npm run dev`.
#
# Usage:
#   ./scripts/dev-db.sh                 # start
#   ./scripts/dev-db.sh status
#   ./scripts/dev-db.sh logs
#   ./scripts/dev-db.sh down            # stop (keeps data volume)
#   ./scripts/dev-db.sh reset           # stop + DELETE the dev volume only
# ─────────────────────────────────────────────────────────────

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ACTION="${1:-up}"
COMPOSE="$ROOT/deploy/local/docker-compose.local.yml"
VOLUME="commandcenter-local_cc-local-pg-data"

case "$ACTION" in
  up)
    docker compose -f "$COMPOSE" up -d
    echo "Dev Postgres ready on localhost:5433 (db: commandcenter_dev, user: commandcenter)"
    ;;
  down)   docker compose -f "$COMPOSE" down ;;
  status) docker compose -f "$COMPOSE" ps ;;
  logs)   docker compose -f "$COMPOSE" logs -f postgres ;;
  reset)
    echo "Deleting ONLY the local dev database volume: $VOLUME"
    docker compose -f "$COMPOSE" down
    docker volume rm -f "$VOLUME"
    docker compose -f "$COMPOSE" up -d
    ;;
  *)
    echo "Usage: $0 [up|down|status|logs|reset]" >&2
    exit 1
    ;;
esac