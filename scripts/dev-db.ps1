# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — local development database (PostgreSQL via Docker)
# Starts ONLY the dev database on host port 5433. The app itself
# runs on the host with hot reload: `npm run dev`.
#
# Usage:
#   .\scripts\dev-db.ps1                 # start
#   .\scripts\dev-db.ps1 status
#   .\scripts\dev-db.ps1 logs
#   .\scripts\dev-db.ps1 down            # stop (keeps data volume)
#   .\scripts\dev-db.ps1 reset           # stop + DELETE the dev volume only
# ─────────────────────────────────────────────────────────────
param([string]$Action = "up")

$compose = "deploy\local\docker-compose.local.yml"
$volume  = "commandcenter-local_cc-local-pg-data"

switch ($Action.ToLower()) {
  "up" {
    docker compose -f $compose up -d
    Write-Host "Dev Postgres ready on localhost:5433 (db: commandcenter_dev, user: commandcenter)"
  }
  "down"      { docker compose -f $compose down }
  "status"    { docker compose -f $compose ps }
  "logs"      { docker compose -f $compose logs -f postgres }
  "reset" {
    Write-Warning "This deletes ONLY the local dev database volume: $volume"
    docker compose -f $compose down
    docker volume rm -f $volume
    docker compose -f $compose up -d
  }
  default {
    Write-Host "Usage: .\scripts\dev-db.ps1 [up|down|status|logs|reset]"
    exit 1
  }
}