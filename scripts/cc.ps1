# ─────────────────────────────────────────────────────────────
# COMMANDCENTER — unified deployment CLI (run from your Windows laptop)
#
#   .\scripts\cc.ps1 local [up|down|status|logs|reset]   # local dev DB
#   .\scripts\cc.ps1 preprod                              # deploy PRE-PROD (SSH -> server)
#   .\scripts\cc.ps1 prod                                 # deploy PROD    (SSH -> server)
#   .\scripts\cc.ps1 status <preprod|prod>
#   .\scripts\cc.ps1 rollback <preprod|prod>
#   .\scripts\cc.ps1 help
#
# Server commands run over SSH: ssh commandcenter-server
#   (alias in ~/.ssh/config -> savlayoddha@100.95.32.99)
#   bash ~/Command-Center/scripts/cc.sh <subcommand>
# Override the default host/remote dir with the CC_REMOTE and
# CC_REMOTE_DIR environment variables if they ever change.
# ─────────────────────────────────────────────────────────────

param(
  [string]$Action = "help",
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Params
)

$Remote = if ($env:CC_REMOTE) { $env:CC_REMOTE } else { "commandcenter-server" }
$RemoteDir = if ($env:CC_REMOTE_DIR) { $env:CC_REMOTE_DIR } else { "~/Command-Center" }

function Invoke-Remote {
  param([string]$Sub)
  $cmd = "bash $RemoteDir/scripts/cc.sh $Sub"
  Write-Host "==> ssh $Remote '$cmd'"
  ssh $Remote $cmd
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Remote command failed (exit $LASTEXITCODE) on $Remote"
    exit $LASTEXITCODE
  }
}

switch ($Action.ToLower()) {
  "local" {
    & "$PSScriptRoot\dev-db.ps1" @Params
    exit $LASTEXITCODE
  }
  "preprod" { Invoke-Remote "preprod" }
  "prod" { Invoke-Remote "prod" }
  "status" {
    if (-not $Params) { Write-Host "Usage: cc.ps1 status <preprod|prod>"; exit 2 }
    Invoke-Remote "status $($Params[0])"
  }
  "rollback" {
    if (-not $Params) { Write-Host "Usage: cc.ps1 rollback <preprod|prod>"; exit 2 }
    Invoke-Remote "rollback $($Params[0])"
  }
  "help" {
    Write-Host @"
COMMANDCENTER deploy CLI (Windows)
  local    [up|down|status|logs|reset]   local dev Postgres (never touches server)
  preprod                                 deploy PRE-PROD from origin/main (port 8080)
  prod                                    deploy PROD from origin/main (port 8081) - requires PROD confirmation
  status   <preprod|prod>                 containers, health, latest release
  rollback <preprod|prod>                 redeploy previous image tag (data untouched)

Server: ssh $Remote  (repo $RemoteDir)
"@
  }
  default {
    Write-Host "Unknown action: $Action" -ForegroundColor Red
    Write-Host "Usage: .\scripts\cc.ps1 <local|preprod|prod|status|rollback|help> [args]"
    exit 2
  }
}