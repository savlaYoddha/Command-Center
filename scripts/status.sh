#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — Status & health for an environment
# Usage: ./scripts/status.sh preprod|prod
# ─────────────────────────────────────────────────────────────

set -euo pipefail
source "$(dirname "$0")/common.sh"

ENV="${1:-}"
if [[ "$ENV" != "preprod" && "$ENV" != "prod" ]]; then
  echo "Usage: $0 preprod|prod" >&2
  exit 2
fi

echo "==> $ENV services"
cc "$ENV" ps

echo ""
echo "==> images"
cc "$ENV" images 2>/dev/null || true

PORT="$(cc "$ENV" port frontend 80 2>/dev/null || true)"
[[ -z "$PORT" ]] && PORT="$(web_port "$ENV")"

echo ""
echo "==> health (http://127.0.0.1:$PORT/api/v1/health)"
if curl -fsS "http://127.0.0.1:$PORT/api/v1/health"; then
  echo ""
  echo "==> healthy"
else
  echo ""
  echo "==> UNHEALTHY"
  exit 1
fi

echo ""
echo "==> recent releases"
cat "$(release_file "$ENV")" 2>/dev/null || echo "(none recorded yet)"