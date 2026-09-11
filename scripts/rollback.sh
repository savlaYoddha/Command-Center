#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — Roll back an environment to its previous release
#
# Re-deploys the previously recorded image tag. If the old image
# is no longer present locally, it is rebuilt from that git commit.
# Never removes containers, volumes, or databases.
#
# Usage: ./scripts/rollback.sh preprod|prod
# ─────────────────────────────────────────────────────────────

set -euo pipefail
source "$(dirname "$0")/common.sh"

ENV="${1:-}"
if [[ "$ENV" != "preprod" && "$ENV" != "prod" ]]; then
  echo "Usage: $0 preprod|prod" >&2
  exit 2
fi

echo "==> COMMANDCENTER rollback: $ENV"
require_env_file "$ENV"

if [[ "$ENV" == "prod" ]]; then
  echo ""
  echo "⚠️  This rolls back PRODUCTION. Volumes and the database are NEVER touched —"
  echo " it only switches the running app back to a previously built image."
  if [[ -n "${CC_CONFIRM_RB:-}" ]]; then
    if [[ "$CC_CONFIRM_RB" != "PROD-ROLLBACK" ]]; then
      echo "Invalid CC_CONFIRM_RB." >&2
      exit 1
    fi
  elif [[ -t 0 ]]; then
    read -r -p "Type PROD-ROLLBACK to continue: " ANSWER
    if [[ "$ANSWER" != "PROD-ROLLBACK" ]]; then
      echo "Aborted — nothing changed." >&2
      exit 1
    fi
  else
    echo "Non-interactive: re-run with CC_CONFIRM_RB=PROD-ROLLBACK only after a human approves." >&2
    exit 1
  fi
fi

HIST="$(release_file "$ENV")"
if [[ ! -s "$HIST" ]]; then
  echo "No release history for $ENV — nothing to roll back to." >&2
  exit 1
fi

PREV="$(release_previous "$ENV")"
if [[ -z "$PREV" ]]; then
  echo "Only one recorded release for $ENV — nothing to roll back to." >&2
  exit 1
fi

read -r PREV_STAMP PREV_TAG PREV_SHA PREV_NOTE <<< "$PREV"
echo "Rolling back to: $PREV_TAG ($PREV_SHA, deployed $PREV_STAMP)"

if docker image inspect "commandcenter-$ENV-frontend:$PREV_TAG" >/dev/null 2>&1 \
  && docker image inspect "commandcenter-$ENV-backend:$PREV_TAG" >/dev/null 2>&1; then
  echo "==> Restarting with previously built image $PREV_TAG (no rebuild)"
  CC_TAG="$PREV_TAG" cc "$ENV" up -d
else
  echo "==> Image $PREV_TAG not present locally — rebuilding from git $PREV_SHA"
  git -C "$ROOT" fetch --prune origin
  git -C "$ROOT" checkout "$PREV_SHA"
  if ! CC_TAG="$PREV_TAG" cc "$ENV" up -d --build; then
    git -C "$ROOT" checkout main
    echo "Rollback build failed — restored working tree to main." >&2
    exit 1
  fi
  git -C "$ROOT" checkout main
  git -C "$ROOT" pull --ff-only origin main
fi

wait_healthy "$ENV"

release_push "$ENV" "$(date +%Y%m%d-%H%M%S)" "$PREV_TAG" "$PREV_SHA" "rollback"
echo "==> Done. $ENV rolled back to $PREV_TAG (volumes/database untouched)"