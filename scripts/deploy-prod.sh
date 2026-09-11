#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — Deploy to PROD (MANUAL, never automatic)
#
# This is the FINAL step. Run only after PRE-PROD passed and a
# human explicitly approves. The script displays the exact commit
# and target domain, then requires typing PROD to continue.
#
#   1. git fetch + checkout main + pull (sourced from GitHub)
#   2. show: commit SHA/tag, target domain, real-data warning
#   3. hard gate: must type PROD
#   4. docker compose build/up tagged main-<sha>  (up -d / up -d --build ONLY)
#
# SAFETY: PRODUCTION volumes and database (cc-prod-*) are NEVER
# removed. Only `up -d` / `up -d --build` is ever used. Never run
# `docker compose down -v` for prod; never delete cc-prod-* volumes.
#
# Usage: ./scripts/deploy-prod.sh       or  ./scripts/cc.sh prod
# ─────────────────────────────────────────────────────────────

set -euo pipefail
source "$(dirname "$0")/common.sh"

ENV="prod"
PORT="$(web_port "$ENV")"

echo "==> COMMANDCENTER PRODUCTION deploy"
require_git
require_env_file "$ENV"
require_env_file_warnings "$ENV"

echo "==> Updating from GitHub (origin/main)"
git -C "$ROOT" fetch --prune origin
git -C "$ROOT" checkout main
git -C "$ROOT" pull --ff-only origin main

SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
TAG="$(release_tag_for "$SHA")"
DOMAIN="$(env_value "$ENV" APP_ORIGIN)"

if [[ -n "$(git -C "$ROOT" status --porcelain)" ]]; then
  echo "Warning: git working tree is not clean. Continuing anyway." >&2
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  PRODUCTION DEPLOY"
echo ""
echo "  Commit : ${SHA}"
echo "  Release: ${TAG}"
echo "  Domain : ${DOMAIN}"
echo "  Port   : ${PORT} (CasaOS owns 80; Cloudflare Tunnel->127.0.0.1:${PORT})"
echo "  Stack  : commandcenter-prod-postgres / -api / -web (container names)"
echo ""
echo "  ⚠️  This starts REAL production services backed by"
echo "  cc-prod-pg-data / cc-prod-uploads / cc-prod-backups."
echo "  These volumes contain live user data and are NEVER deleted."
echo "═══════════════════════════════════════════════════════════"
echo ""

# Hard gate: an authorized human must confirm PROD. In a terminal the
# operator types PROD. In a non-interactive session (agent/SSH without TTY)
# a confirmation token must be supplied explicitly — an agent must NEVER
# set it without the human approving the summary printed above.
confirm_prod() {
  if [[ -n "${CC_CONFIRM_PROD:-}" ]]; then
    if [[ "$CC_CONFIRM_PROD" != "PROD" ]]; then
      echo "Invalid CC_CONFIRM_PROD." >&2
      exit 1
    fi
    return 0
  fi
  if [[ -t 0 ]]; then
    read -r -p "Type PROD to deploy: " ANSWER
    if [[ "$ANSWER" == "PROD" ]]; then return 0; fi
    echo "Aborted — nothing changed."
    exit 1
  fi
  echo "Non-interactive session detected. After a human approves the summary"
  echo "above, re-run with:  CC_CONFIRM_PROD=PROD ./scripts/deploy-prod.sh" >&2
  exit 1
}

confirm_prod

if [[ "$(last_release_sha "$ENV")" == "$SHA" ]]; then
  echo "==> $SHA is already the deployed PROD release — idempotent restart"
  CC_TAG="$TAG" cc "$ENV" up -d
else
  echo "==> Building & starting $TAG on prod"
  CC_TAG="$TAG" cc "$ENV" up -d --build
fi

wait_healthy "$ENV"

release_push "$ENV" "$(date +%Y%m%d-%H%M%S)" "$TAG" "$SHA"
echo "==> Done. PROD running $TAG (https://commandcenter.savlayoddha.in)"