# AGENTS.md — COMMANDCENTER Operations Guide

This file governs how AI agents working through OpenCode operate the COMMANDCENTER
deployment system. Read it fully before touching deploy-related commands.

## Environments

| Env | Where | Host port | DB | Volumes | Deployment source |
| --- | --- | --- | --- | --- | --- |
| LOCAL | Windows dev laptop | 5433 (Postgres); app via `npm run dev` | `cc-local-pg-data` (db `commandcenter_dev`) | local only | working tree |
| PRE-PROD | Ubuntu server `savlayoddha@100.95.32.99` | **8080** → `https://staging.commandcenter.savlayoddha.in` | `cc-preprod-pg-data` | `cc-preprod-uploads`, `cc-preprod-backups` | GitHub `origin/main` |
| PROD | Ubuntu server `savlayoddha@100.95.32.99` | **8081** → `https://commandcenter.savlayoddha.in` | `cc-prod-pg-data` | `cc-prod-uploads`, `cc-prod-backups` | GitHub `origin/main` |

CasaOS owns host port 80 on the server. Cloudflare Tunnel maps the two domains to
`127.0.0.1:8080` (staging) and `127.0.0.1:8081` (prod). Never change these ports.

## SSH connection

- Host alias: `commandcenter-server` (defined in the SSH config on the Windows
  laptop, `~/.ssh/config`, mapping to `savlayoddha@100.95.32.99` over Tailscale).
  Key auth from the laptop works. Never hardcode/commit private keys; never copy
  a private key to the server; never print key material into logs. If the alias
  is missing, the direct host `savlayoddha@100.95.32.99` is equivalent.
- Repository location on the server: `~/Command-Center`
- Sanity check: `ssh commandcenter-server 'cd ~/Command-Center && git rev-parse --short HEAD'`
- The `cc.ps1` wrapper defaults to `commandcenter-server` (override with `CC_REMOTE`).

## The stable interface (prefer this over ad-hoc docker/git commands)

Windows side (PowerShell):
```
.\scripts\cc.ps1 local [up|down|status|logs|reset]   # LOCAL dev Postgres only — never touches the server
.\scripts\cc.ps1 preprod                              # deploy PRE-PROD from origin/main over SSH
.\scripts\cc.ps1 prod                                 # deploy PROD — hard confirmation required
.\scripts\cc.ps1 status <preprod|prod>
.\scripts\cc.ps1 rollback <preprod|prod>
```
or `npm run deploy:preprod` / `npm run deploy:prod` / `npm run cc:status -- preprod` / etc.

Server side (run via `ssh ... 'bash ~/Command-Center/scripts/cc.sh <sub>'`):
```
bash scripts/cc.sh local [up|down|status|logs|reset]   # dev machine only
bash scripts/cc.sh preprod
bash scripts/cc.sh prod
bash scripts/cc.sh status <preprod|prod>
bash scripts/cc.sh rollback <preprod|prod>
```

To run bash on the Windows laptop when needed, git bash is at
`C:\Program Files\Git\bin\bash.exe`. Prefer `scripts\cc.ps1` for anything deploy-related.

## LOCAL procedure

1. Start dev DB: `.\scripts\cc.ps1 local up` (Postgres on `localhost:5433`, db `commandcenter_dev`).
   This runs only on the laptop and never touches PRE-PROD/PROD.
2. Dev backend reads `backend\.env` (gitignored). If missing, copy
   `deploy\local\.env.local.example` → `backend\.env`.
3. Run `npm run dev` → backend `:3000` (hot reload via `tsx watch`), frontend Vite `:5173`.
4. Never point LOCAL at preprod/prod databases, volumes, or secrets.

## PRE-PROD procedure (safe to repeat; idempotent)

1. Confirm the release passed CI (GitHub Actions on `main`).
2. `.\scripts\cc.ps1 preprod`
3. The script fetches `origin/main`, checks out `main`, builds images tagged `main-<sha>`,
   starts the stack, waits for the health endpoint, and records the release.
   Re-running the same commit is an idempotent restart — no duplicate containers/volumes.
4. Verify: `.\scripts\cc.ps1 status preprod` → all services healthy,
   then `curl -fsS http://127.0.0.1:8080/api/v1/health`.

PRE-PROD may be freely rebuilt/reset; it shares nothing with PROD.

## PROD procedure — NEVER AUTOMATIC

Rules that MUST be followed on every PROD action:

- PROD deployment is **never automatic**. Do not deploy PROD automatically,
  in a pipeline, or in the same step as a PRE-PROD deploy — ever.
- Before running any PROD command, **stop** and show the user:
  - the exact commit SHA/tag about to be deployed (`git rev-parse --short HEAD` or the script's summary),
  - the target domain `https://commandcenter.savlayoddha.in`,
  - the fact that real production data (cc-prod-* volumes) is in use.
- Then ask the user for explicit approval. Only after they approve, run:
  `.\scripts\cc.ps1 prod`
- The script prints the same summary and requires a `PROD` gate. When running over
  non-interactive SSH it will refuse unless invoked with `CC_CONFIRM_PROD=PROD`
  (e.g. `ssh commandcenter-server 'cd ~/Command-Center && CC_CONFIRM_PROD=PROD bash scripts/cc.sh prod'`).
  **Never** set `CC_CONFIRM_PROD` without an explicit human yes.
- PROD deploys use only `docker compose up -d` / `up -d --build`.

## Rollback procedure

- PRE-PROD: `.\scripts\cc.ps1 rollback preprod`
- PROD: `.\scripts\cc.ps1 rollback prod` — the script re-deploys the previously
  recorded image tag (rebuilds from that commit only if the image is gone).
  For PROD it also requires a `PROD-ROLLBACK` gate (or `CC_CONFIRM_RB=PROD-ROLLBACK`
  after human approval over non-interactive SSH). Never roll back beyond the previous
  release without a human decision.
- Rollback never removes containers, volumes, or database data. It only switches
  the running image.

## Health checks

- API: `GET /api/v1/health` → `{"status":"ok"}`.
- `cc.ps1 status <env>` polls container states and the health endpoint and prints
  the latest release record (`deploy/.releases/<env>.txt`).
- Direct: `curl -fsS http://127.0.0.1:8080/api/v1/health` (preprod),
  `curl -fsS http://127.0.0.1:8081/api/v1/health` (prod, on the server).

## Forbidden destructive commands

The following are prohibited for PRE-PROD and PROD operations:

- `docker compose down -v` / `--volumes` against PRE-PROD or PROD (a guard
  in `scripts/common.sh` hard-blocks it for PROD).
- `docker volume rm` of `cc-*` volumes, especially `cc-prod-*`.
- Deleting `deploy/prod/.env.prod` or production backup files.
- `docker system prune` / `docker volume prune` / `docker images prune` of any kind.
- Running cleanup commands against unrelated Docker containers, volumes, networks,
  or images that are not part of the commandcenter environment.
- Manually editing/restoring the production database outside `scripts/backup-prod.sh`.

When in doubt, prefer non-destructive operations and ask the user.

## Idempotency

`deploy-preprod.sh` / `deploy-prod.sh` compare the target commit against the last
recorded release; unchanged commits reuse existing containers/volumes instead of
rebuilding. Compose recreates the same named containers and reuses the same named
volumes, so repeated deploys never duplicate resources.

## Still to configure manually (one time, never committed)

- `deploy/preprod/.env.preprod` and `deploy/prod/.env.prod` (from their `.example`
  files) with real secrets: `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `INITIAL_ADMIN_PASSWORD`, plus `APP_ORIGIN` set to the matching domain.
- The GitHub remote (`origin`) on both the laptop and server, and HTTPS auth (PAT) or a deploy key.
- Cloudflare Tunnel config (already routes staging→8080, prod→8081).
- First PROD boot auto-creates the admin user only if the users table is empty.