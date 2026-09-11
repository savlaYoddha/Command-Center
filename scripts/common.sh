#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — common helpers for server-side ops scripts.
# Source this (BASH_SOURCE-aware) from scripts/deploy-*.sh,
# scripts/rollback.sh, scripts/status.sh, scripts/backup-*.sh.
# ─────────────────────────────────────────────────────────────

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASES_DIR="$ROOT/deploy/.releases"

# Fail unless the per-environment secrets file exists.
require_env_file() {
  local env="$1"
  local file="$ROOT/deploy/$env/.env.$env"
  if [[ ! -f "$file" ]]; then
    echo "[common] Error: secrets file missing: $file" >&2
    echo "[common] Create it from $file.example and fill in real values." >&2
    exit 1
  fi
}

# Warn (but do not abort) about placeholder/empty secrets in an env file.
require_env_file_warnings() {
  local env="$1"
  local file="$ROOT/deploy/$env/.env.$env"
  if grep -Eq '^[A-Za-z0-9_]+[[:space:]]*=[[:space:]]*$' "$file"; then
    echo "[common] Warning: some values are EMPTY in $file" >&2
  fi
  if grep -q 'change-me' "$file"; then
    echo "[common] Warning: $file still contains 'change-me' placeholder values" >&2
  fi
}

# Read one KEY=value line from an environment file (echoes value or nothing).
env_value() {
  local env="$1" key="$2"
  local file="$ROOT/deploy/$env/.env.$env"
  [[ -f "$file" ]] || return 0
  grep -E "^${key}=" "$file" | tail -n 1 | cut -d= -f2-
}

# Fail unless ROOT is a git working copy with the app checked out.
require_git() {
  if ! git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
    echo "[common] Error: $ROOT is not a git repository." >&2
    echo "[common] Deploy flow is git-based: feature/* -> PR -> main (GitHub) -> this server." >&2
    exit 1
  fi
}

# Refuse commands that would delete PROD data. Called by cc() for prod.
guard_data_destructive() {
  local env="$1"; shift
  [[ "$env" != "prod" ]] && return 0
  local arg prev="" vdown="no"
  for arg in "$@"; do
    case "$arg" in
      down) vdown="yes" ;;
      -v|--volumes)
        if [[ "$vdown" == "yes" ]]; then
          echo "[guard] BLOCKED: 'docker compose down -v/--volumes' would delete PRODUCTION volumes (cc-prod-*)." >&2
          exit 1
        fi
        ;;
      rm)
        if [[ "$prev" == "volume" ]]; then
          echo "[guard] BLOCKED: 'docker volume rm' is not allowed for PROD (cc-prod-* volumes hold real user data)." >&2
          exit 1
        fi
        echo "[guard] BLOCKED: 'docker compose rm' is not allowed for PROD." >&2
        exit 1
        ;;
    esac
    prev="$arg"
  done
  return 0
}

# Run docker compose for a given environment with its secrets file.
# Shell env vars (e.g. CC_TAG) override the env-file during interpolation.
cc() {
  local env="$1"; shift
  guard_data_destructive "$env" "$@"
  docker compose \
    -f "$ROOT/deploy/$env/docker-compose.$env.yml" \
    --env-file "$ROOT/deploy/$env/.env.$env" \
    "$@"
}

release_file() { echo "$RELEASES_DIR/$1.txt"; }

# Record a successful deploy (or rollback) for an environment.
# Format, one entry per line: TIMESTAMP  TAG  SHA  NOTE
release_push() {
  local env="$1" stamp="$2" tag="$3" sha="$4" note="${5:-deploy}"
  mkdir -p "$RELEASES_DIR"
  printf '%-16s %-24s %s %s\n' "$stamp" "$tag" "$sha" "$note" >> "$(release_file "$env")"
}

# Print the entry immediately before the most recent one (if any).
release_previous() {
  local env="$1"
  local f="$(release_file "$env")"
  [[ -s "$f" ]] || return 1
  head -n -1 "$f" | tail -n 1
}

# Short SHA of the most recent recorded release for an env (empty if none).
last_release_sha() {
  local env="$1"
  local f="$(release_file "$env")"
  [[ -s "$f" ]] || return 0
  tail -n 1 "$f" | awk '{print $3}'
}

# Host web port for an env (preprod 8080, prod 8081 — CasaOS owns 80).
web_port() {
  local env="$1"
  if [[ "$env" == "prod" ]]; then echo 8081; else echo 8080; fi
}

# Host port the frontend container actually publishes (e.g. "8080").
# Falls back to the static web_port when `compose port` can't tell yet.
host_port() {
  local env="$1" p
  p="$(cc "$env" port frontend 80 2>/dev/null | sed -E 's/^.*:([0-9]+)$/\1/' | tail -n 1 || true)"
  echo "${p:-$(web_port "$env")}"
}

# Poll the public health endpoint until it responds or times out.
wait_healthy() {
  local env="$1" tries="${2:-60}"
  local port
  port="$(host_port "$env")"
  echo "[common] Waiting for health at http://127.0.0.1:$port/api/v1/health"
  local i
  for ((i = 1; i <= tries; i++)); do
    if curl -fsS "http://127.0.0.1:$port/api/v1/health" >/dev/null 2>&1; then
      echo "[common] Health OK after ${i}s"
      return 0
    fi
    sleep 1
  done
  echo "[common] ERROR: health check failed after ${tries}s" >&2
  return 1
}

# Stream a pg_dump of the env's PostgreSQL into a local .sql file.
db_backup() {
  local env="$1"
  local out="${2:-$ROOT/backups/$env-$(date +%Y%m%d-%H%M%S).sql}"
  mkdir -p "$ROOT/backups"
  echo "[common] Backing up $env database -> $out"
  cc "$env" exec -T postgres \
    pg_dump -U commandcenter --no-owner --no-privileges commandcenter > "$out"
  echo "[common] Backup written to $out"
}

# Generate or fetch the release tag for a commit SHA (main-<short>).
release_tag_for() {
  echo "main-$(git -C "$ROOT" rev-parse --short "$1")"
}