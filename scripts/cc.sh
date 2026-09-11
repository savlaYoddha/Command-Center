#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — unified deployment CLI (runs on the Ubuntu server)
#
#   ./scripts/cc.sh local [up|down|status|logs|reset]
#   ./scripts/cc.sh preprod
#   ./scripts/cc.sh prod
#   ./scripts/cc.sh status <preprod|prod>
#   ./scripts/cc.sh rollback <preprod|prod>
#   ./scripts/cc.sh help
#
# From Windows, the same commands go through scripts/cc.ps1,
# which SSHes here with: ssh commandcenter-server
#   (alias in ~/.ssh/config -> savlayoddha@100.95.32.99)
#   bash ~/Command-Center/scripts/cc.sh ...
# ─────────────────────────────────────────────────────────────

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CMD="${1:-help}"
shift || true

case "$CMD" in
  local)
    exec bash "$ROOT/scripts/dev-db.sh" "${@:-up}"
    ;;
  preprod)
    exec bash "$ROOT/scripts/deploy-preprod.sh"
    ;;
  prod)
    exec bash "$ROOT/scripts/deploy-prod.sh"
    ;;
  status)
    if [[ -z "${1:-}" ]]; then
      echo "Usage: cc.sh status <preprod|prod>" >&2
      exit 2
    fi
    exec bash "$ROOT/scripts/status.sh" "$1"
    ;;
  rollback)
    if [[ -z "${1:-}" ]]; then
      echo "Usage: cc.sh rollback <preprod|prod>" >&2
      exit 2
    fi
    exec bash "$ROOT/scripts/rollback.sh" "$1"
    ;;
  help | "")
    cat <<'EOF'
COMMANDCENTER deploy CLI
  local   [up|down|status|logs|reset]   local dev Postgres (dev machine only)
  preprod                               deploy PRE-PROD from origin/main (port 8080)
  prod                                  deploy PROD from origin/main (port 8081) — requires PROD confirmation
  status  <preprod|prod>                containers, health, latest release
  rollback <preprod|prod>               redeploy previous image tag (data untouched)
EOF
    ;;
  *)
    echo "Unknown command: $CMD" >&2
    exit 2
    ;;
esac