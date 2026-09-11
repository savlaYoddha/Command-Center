#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — Deploy to PRE-PROD (manual, on the server)
#
# Flow: feature/* -> PR -> main (GitHub) -> run this script.
#   1. git fetch + checkout main + pull (sourced from GitHub)
#   2. docker compose build/up with tag main-<sha>
#   3. waits for /api/v1/health, records release for rollback
#
# Usage: ./scripts/deploy-preprod.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail
source "$(dirname "$0")/common.sh"

ENV="preprod"

echo "==> COMMANDCENTER PRE-PROD deploy"
require_git
require_env_file "$ENV"

echo "==> Updating from GitHub (origin/main)"
git -C "$ROOT" fetch --prune origin
git -C "$ROOT" checkout main
git -C "$ROOT" pull --ff-only origin main

SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
TAG="$(release_tag_for "$SHA")"

echo "==> Building & starting $TAG on preprod"
CC_TAG="$TAG" cc "$ENV" up -d --build

wait_healthy "$ENV"

release_push "$ENV" "$(date +%Y%m%d-%H%M%S)" "$TAG" "$SHA"
echo "==> Done. PRE-PROD running $TAG on :8080"