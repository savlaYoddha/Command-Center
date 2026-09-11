# COMMANDCENTER

Personal self-hosted life management platform. The homepage is the command center; Tasks, Finance, Vehicles, Documents, Homelab, Dashboard, and Settings are modules in the same system.

**Phase 1 (this release):** foundation, authentication, HUD design system, main layout, homepage module tiles, and placeholder module pages.

Primary domain: `https://everything.savlayoddha.in`

## Architecture

```
commandcenter/
  frontend/     React + Vite + TypeScript + Tailwind
  backend/      Express + TypeScript + SQLite + Drizzle
  data/         SQLite database + uploads (persist this directory)
  scripts/      Backup / restore
```

Modules stay independent. Cross-links will use IDs, not duplicated records. New modules register in `frontend/src/modules/registry.ts` and `backend/src/modules/`.

## Tech stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Zustand, React Router, Lucide
- Backend: Node.js, Express, TypeScript, JWT cookies, bcryptjs
- Database: SQLite via Drizzle ORM and Node.js `node:sqlite`
- Deploy: Docker Compose, single container on port 3000

## Installation (local development)

Requirements: Node.js 22.5+ (24 recommended). SQLite uses the built-in `node:sqlite` module, so no Visual Studio C++ toolchain is required on Windows.

```bash
cd commandcenter
cp .env.example .env
```

Edit `.env` and set strong `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `INITIAL_ADMIN_PASSWORD`.

```bash
cd backend && npm install
cd ../frontend && npm install
```

Terminal 1:

```bash
cd backend && npm run dev
```

Terminal 2:

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`

Default first-boot operator (only created when the user table is empty):

- Username: value of `INITIAL_ADMIN_USERNAME` (default `admin`)
- Password: value of `INITIAL_ADMIN_PASSWORD`

Change the password immediately in Settings.

## Environment variables

See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `PORT` | API / production HTTP port (3000) |
| `DATA_DIR` | SQLite + uploads root |
| `JWT_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `COOKIE_SECURE` | `true` behind HTTPS |
| `COOKIE_SAMESITE` | `lax`, `strict`, or `none` |
| `INITIAL_ADMIN_USERNAME` | First-boot username |
| `INITIAL_ADMIN_PASSWORD` | First-boot password |
| `APP_ORIGIN` | Allowed CORS origin in production |

Never commit `.env`.

## Database

SQLite file: `data/database.sqlite`

Schema lives in `backend/src/database/schema/`. Phase 1 tables:

- `users`, `sessions`, `user_settings`
- `activity` (central feed)
- `notifications` (framework, no email/push yet)

Migrations are applied on startup (`backend/src/database/migrate.ts`). SQL copies are also stored in `backend/src/database/migrations/`.

```bash
cd backend
npm run db:generate   # drizzle-kit, when schema changes
```

## Docker deployment

```bash
cp .env.example .env
# set secrets and INITIAL_ADMIN_PASSWORD
docker compose up -d --build
```

The app listens on **port 3000**.

Persistent volume:

```
./data:/app/data
```

`docker compose down` does **not** delete `./data`. Recreating the container keeps the database and uploads.

Health check: `GET /api/v1/health`

```json
{ "status": "ok" }
```

Put Cloudflare Tunnel / Tailscale / reverse proxy in front of port 3000. Set `COOKIE_SECURE=true` and `APP_ORIGIN=https://everything.savlayoddha.in` when serving HTTPS.

## Backup

All application data is the `data/` directory (SQLite + uploads).

Linux / macOS:

```bash
chmod +x scripts/backup.sh scripts/restore.sh
./scripts/backup.sh
./scripts/restore.sh backups/commandcenter-YYYYMMDD-HHMMSS.tar.gz
```

Windows (PowerShell), from the project root:

```powershell
New-Item -ItemType Directory -Force backups | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
tar -czf "backups/commandcenter-$stamp.tar.gz" data
```

Restore:

```powershell
tar -xzf backups/commandcenter-YYYYMMDD-HHmmss.tar.gz
```

Stop the container before restore if the database is in use:

```bash
docker compose down
# restore data/
docker compose up -d
```

## Updating

```bash
git pull
docker compose up -d --build
```

Keep `data/` unmounted and untracked except `.gitkeep` files.

## API (Phase 1)

Base path: `/api/v1`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | no | Liveness |
| POST | `/auth/login` | no | Login |
| POST | `/auth/logout` | no | Logout |
| POST | `/auth/refresh` | cookie | Refresh access cookie |
| GET | `/auth/me` | yes | Current operator |
| POST | `/auth/password` | yes | Change password |
| GET | `/overview` | yes | Homepage payload |
| GET/PUT | `/settings` | yes | Appearance |
| GET | `/activity` | yes | Recent activity |
| GET | `/notifications` | yes | Notification inbox |

Authenticated endpoints use httpOnly cookies (`cc_access`, `cc_refresh`).

## Troubleshooting

**Cannot login after first boot**  
Confirm `.env` password matches what you type. If you already started once, the initial admin is not recreated. Reset by stopping the app and deleting `data/database.sqlite` (this wipes all data).

**Frontend cannot reach API in development**  
Backend must run on port 3000. Vite proxies `/api` from 5173.

**Cookies fail behind HTTPS**  
Set `COOKIE_SECURE=true` and a matching `APP_ORIGIN`.

**better-sqlite3 build errors**  
Use Node 22. On Debian-based images, install `python3`, `make`, and `g++` if prebuilds are missing.

## Phase roadmap

1. Foundation (current)
2. Tasks (global kanban)
3. Task advanced features
4. Finance
5. Vehicles
6. Documents
7. Homelab
8. Cross-module links, notifications, global search
9. Polish, backup UI, accessibility
