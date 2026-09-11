#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — Deploy to PRE-PROD (manual, on the server)
#
# Flow: feature/* -> PR -> main (GitHub) -> run this script.
#   1. git fetch + checkout main + pull (sourced from GitHub)
#   2. build/run images tagged main-<sha>
#   3. waits for /api/v1/health, records release for rollback
#
# Idempotent: re-running with the same commit simply reuses the
# existing PRE-PROD containers/volumes (no rebuild, no duplicates).
#
# Usage: ./scripts/deploy-preprod.sh
#    or  ./scripts/cc.sh preprod
# ─────────────────────────────────────────────────────────────

set -euo pipefail
source "$(dirname "$0")/common.sh"

ENV="preprod"
PORT="$(web_port "$ENV")"

echo "==> COMMANDCENTER PRE-PROD deploy"
require_git
require_env_file "$ENV"
require_env_file_warnings "$ENV"

echo "==> Updating from GitHub (origin/main)"
git -C "$ROOT" fetch --prune origin
git -C "$ROOT" checkout main
git -C "$ROOT" pull --ff-only origin main

SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
TAG="$(release_tag_for "$SHA")"

if [[ "$(last_release_sha "$ENV")" == "$SHA" ]]; then
  echo "==> $SHA is already the deployed PRE-PROD release — idempotent restart"
  CC_TAG="$TAG" cc "$ENV" up -d
else
  echo "==> Building & starting $TAG on preprod"
  CC_TAG="$TAG" cc "$ENV" up -d --build
fi

wait_healthy "$ENV"

release_push "$ENV" "$(date +%Y%m%d-%H%M%S)" "$TAG" "$SHA"
echo "==> Done. PRE-PROD running $TAG on :$PORT (https://staging.commandcenter.savlayoddha.in)"