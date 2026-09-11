#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — Deploy to PROD (manual approval, on the server)
#
# This is the FINAL step. Only run after PRE-PROD passed and a
# human approved the release.
#   1. hard gate: you must type PROD to continue
#   2. git fetch + checkout main + pull (sourced from GitHub)
#   3. docker compose build/up with tag main-<sha>  (up -d ONLY)
#
# SAFETY: production volumes/database are NEVER removed. Only
# `up -d` / `up -d --build` is ever used here. Never run
# `docker compose down -v` or delete cc-prod-* volumes.
#
# Usage: ./scripts/deploy-prod.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail
source "$(dirname "$0")/common.sh"

ENV="prod"

echo "==> COMMANDCENTER PRODUCTION deploy"
require_git
require_env_file "$ENV"

echo ""
echo "⚠️  This deploys to PRODUCTION (real user data: cc-prod-* volumes)."
echo "⚠️  Volumes/database are NEVER touched by this script."
read -r -p "Type PROD to continue: " ANSWER
if [[ "$ANSWER" != "PROD" ]]; then
  echo "Aborted."
  exit 1
fi

echo "==> Updating from GitHub (origin/main)"
git -C "$ROOT" fetch --prune origin
git -C "$ROOT" checkout main
git -C "$ROOT" pull --ff-only origin main

SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
TAG="$(release_tag_for "$SHA")"

echo "==> Building & starting $TAG on prod"
CC_TAG="$TAG" cc "$ENV" up -d --build

wait_healthy "$ENV"

release_push "$ENV" "$(date +%Y%m%d-%H%M%S)" "$TAG" "$SHA"
echo "==> Done. PROD running $TAG on :80"