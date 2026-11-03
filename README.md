# Project Hub

A focused workspace for internship projects, team tasks, technical specifications (TZ), and curator sign-off.

![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)
![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)

## Live deployment

| Service | Link |
| --- | --- |
| Frontend | [project-hub-baha998.vercel.app](https://project-hub-baha998.vercel.app) |
| Backend health (local) | [GET /api/v1/health](http://localhost:8080/api/v1/health) |
| Backend API (Render) | [project-hub-api-4fiq.onrender.com](https://project-hub-api-4fiq.onrender.com) |
| Backend health (production) | [GET /api/v1/health](https://project-hub-api-4fiq.onrender.com/api/v1/health) |

Badges describe the deployment stack; they are not uptime checks. A healthy API returns `{"success":true,"data":{"status":"ok"}}`. Startup verifies database connectivity; the health route itself is a liveness check.

## Features

- Project grid and dense table views, status filters, completion bars, and file counts.
- Kanban board with `TODO`, `IN_PROGRESS`, and `DONE`, quick transitions, assignees, due dates, and `LOW` / `MEDIUM` / `HIGH` priorities.
- Curator metrics for total projects, project completion, students, uploaded files, approvals, and pending reviews.
- Curator approval through `is_approved_by_curator`; approval also marks the project `COMPLETED`.
- JWT authentication, bcrypt passwords, and role-aware actions.
- Persistent light/dark theme, keyboard focus states, reduced-motion support, and English, Russian, and Kazakh translations.

## Architecture

```text
.
|-- cmd/api/main.go              # Composition root and HTTP server
|-- internal/
|   |-- domain/                 # Entities and repository interfaces
|   |-- usecase/                # Business rules, permissions, workflows
|   |-- repository/postgres/    # pgx/v5 implementations and pool configuration
|   `-- handler/http/           # REST handlers, routing, auth and CORS middleware
|-- pkg/jwt/                    # HS256 token generation and validation
|-- migrations/                 # Ordered golang-migrate up/down SQL files
|-- frontend/
|   |-- src/api/                # Axios client and typed endpoint wrappers
|   |-- src/components/         # Shared controls, Kanban, table, review UI
|   |-- src/context/            # Auth, theme, and toast state
|   |-- src/pages/              # Login, registration, projects and project detail
|   |-- src/locales/            # en, ru, kk translations
|   `-- vercel.json             # SPA history fallback
|-- seed.sql                    # Repeatable demonstration data
|-- Dockerfile
`-- docker-compose.yml
```

Handlers call use cases, which depend on interfaces in `domain`. PostgreSQL repositories implement those interfaces; `main.go` wires them together. This checkout uses Go's standard `net/http` router (method-aware `ServeMux`), React **19**, TypeScript, Vite, and Tailwind 3. It does not currently depend on Chi or React 18.

## Role and permission matrix

| Action | ADMIN / Curator | LEAD | MEMBER |
| --- | --- | --- | --- |
| View projects, tasks, and file metadata | Yes | Yes | Yes |
| Create projects | Yes | Yes | No |
| Edit / delete projects | Any | Owned projects | No |
| Create tasks | Yes | Yes | No |
| Edit / delete tasks | Any | Owned projects | No |
| Change task status | Any | Any | Assigned tasks only |
| Upload files | Yes | Yes | Yes |
| Delete files | Any | Any | Own uploads |
| View curator analytics | Yes | No | No |
| Approve / revoke curator sign-off | Yes | No | No |

These rules describe the implemented workspace model: there is no project-membership table or private team isolation. ADMIN registration requires `ADMIN_SECRET_KEY`; normal registration offers LEAD and MEMBER.

## Prerequisites

- Go 1.25.4 or later, Node.js 22.12+ (Vite 8), npm.
- PostgreSQL 16+ or a Supabase project.
- [golang-migrate CLI](https://github.com/golang-migrate/migrate/tree/master/cmd/migrate) with PostgreSQL support; `psql` for optional seeding.
- Docker and Compose for the container workflow.

## Local development

Commands below use PowerShell from the repository root.

```powershell
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env.local
```

Edit `.env` with your database details and fresh random `JWT_SECRET` and `ADMIN_SECRET_KEY` values. To use local PostgreSQL, remove/comment out `DATABASE_URL` so the `DB_*` settings take effect. The example defaults match the Compose database.

```powershell
docker compose up -d postgres
$env:DATABASE_URL = 'postgresql://project_hub:project_hub@localhost:5432/project_hub?sslmode=disable'
migrate -path migrations -database "$env:DATABASE_URL" up
go run ./cmd/api
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). The frontend defaults to `http://localhost:8080/api/v1`. Existing shell environment values take precedence over `.env`.

### Full Docker workflow

```powershell
docker compose up --build -d
```

Compose starts PostgreSQL, applies migrations, and starts the API on port 8080. Run the frontend separately. Uploads persist in a Docker volume. The Compose configuration contains development credentials; supply independent secrets for hosted deployments.

## Supabase connection and migrations

Copy the exact URI from your project's **Connect** dialog. Replace placeholders and URI-encode the password, including characters such as `@`, `:`, `/`, `?`, and `#`.

```dotenv
# Direct database (requires a network with access to the project's direct address)
DATABASE_URL=postgresql://postgres:ENCODED_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require

# Shared session pooler (usually the practical IPv4 option for a persistent API)
DATABASE_URL=postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require

# Transaction pooler (API automatically disables prepared statement caching)
DATABASE_URL=postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require
```

Use `sslmode=require` for hosted connections, or `verify-full` with your trusted CA configuration when certificate identity verification is required. The API adds `sslmode=require` if it is missing for recognized Supabase hosts, and rejects modes that permit plaintext fallback. On port 6543 it sets pgx v5 `DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol` and disables statement/description caches. The legacy `prefer_simple_protocol=true` URI option is translated and removed before connecting; it is not forwarded to PostgreSQL.

Run migrations through a **direct or session port-5432 connection**, not the transaction pooler, because the migration driver uses session-scoped advisory locks. Keep pgx-specific query options out of the migration URI.

```powershell
$env:MIGRATION_DATABASE_URL = 'postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@YOUR_SESSION_POOLER:5432/postgres?sslmode=require'
migrate -path migrations -database "$env:MIGRATION_DATABASE_URL" up
migrate -path migrations -database "$env:MIGRATION_DATABASE_URL" version
# Optional demo data, after all three migrations:
psql "$env:MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f seed.sql
```

You can also paste `seed.sql` into Supabase's SQL editor after applying the migrations. Seeding inserts application users in `public.users`; it does not use Supabase Auth. Do not expose these application tables through Supabase's public Data API without appropriate RLS/access controls; browser requests should use the Go API.

If Supabase reports **tenant/user not found**, recopy the pooler hostname, region, project reference, and username from the same project's Connect dialog. SSL or protocol changes do not repair a mismatched tenant.

## Vercel and API hosting

1. Import the repository in Vercel and select **frontend** as the Root Directory.
2. Select Vite; use `npm run build`, output directory `dist`, and Node.js 22.12+.
3. Set `VITE_API_URL=https://project-hub-api-4fiq.onrender.com/api/v1` for the relevant Vercel environments, then rebuild. A bare API origin also works; Axios normalizes `/api/v1` and attaches the bearer token through its request interceptor.
4. `frontend/vercel.json` rewrites application paths to `/index.html` so direct visits to `/projects/:id` load the SPA.
5. Deploy the Go Dockerfile on a persistent Go/container host with HTTPS, configure the backend variables below, and mount persistent storage at `UPLOAD_DIR`.
6. The production Vercel origin is already allowed by CORS. Add exact preview/custom origins using `CORS_ALLOWED_ORIGINS`; arbitrary `*.vercel.app` origins are not trusted.
7. Check the API health URL and test registration/login, project navigation, task status updates, uploads, and curator approval against the deployed API.

Supabase hosts PostgreSQL; it does not run this Go API. Vercel hosts this frontend. File bytes are currently stored on the backend filesystem, not in Supabase Storage. `/uploads/` downloads are public to anyone with the random file URL; use non-sensitive demo files until authenticated downloads are implemented.

## Environment reference

| Variable | Where | Required / default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Backend | Required for Supabase; otherwise `DB_*` | PostgreSQL URI, including `sslmode=require` when hosted |
| `JWT_SECRET` | Backend | Set a fresh random secret in production | HS256 signing secret; never use the development fallback |
| `ADMIN_SECRET_KEY` | Backend | Set a fresh random secret in production | Required to self-register an ADMIN account |
| `VITE_API_URL` | Frontend build | Local default: `http://localhost:8080/api/v1` | Public API base, embedded by Vite; never put secrets here |
| `PORT` | Backend | `8080` | HTTP listen port |
| `JWT_TTL` | Backend | `24h` | Go duration for token expiry |
| `UPLOAD_DIR` | Backend | `./uploads` | Persistent file storage directory |
| `CORS_ALLOWED_ORIGINS` | Backend | Empty | Additional exact origins, comma separated |
| `DB_HOST` / `DB_PORT` | Backend | `localhost` / `5432` | Used only when `DATABASE_URL` is unset |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Backend | `project_hub` | Local/discrete database credentials |
| `DB_SSLMODE` | Backend | `disable` | Local/discrete SSL mode; use `require` when hosted |
| `MIGRATION_DATABASE_URL` | CLI only | Set for migration/seed commands | Direct/session URI on port 5432; not read by the API |

Keep `.env` and `frontend/.env.local` out of Git. Only commit the example files.

## Demo accounts

Run `seed.sql` once after migrations. All three accounts use the demonstration password **`DemoHub!2026`**.

| Role | Email |
| --- | --- |
| ADMIN / Curator | `curator@kbtu.kz` |
| LEAD | `lead@kbtu.kz` |
| MEMBER | `student@kbtu.kz` |

The seed adds two projects, six tasks covering every status and priority, and both approved and pending review states. The MEMBER has assigned work to demonstrate permitted status transitions. File counts begin at zero; upload a real TZ document through the UI to demonstrate file handling. Re-running the script preserves existing demo records and their passwords. Legacy `@projecthub.demo` accounts with the seed's exact IDs and roles are upgraded to the listed addresses and demo password, preserving assignments. Use a demonstration database for these publicly documented credentials.

## Validation

```powershell
go test ./...
go vet ./...
cd frontend
npm run build
npm run lint
```

Backend regression tests cover Supabase TLS/protocol configuration, credential encoding, CORS preflight/origin handling, MEMBER task-creation denial, and strict HS256 token validation. A real deployment additionally needs valid Supabase credentials and a reachable API hostname.

Connection behavior follows [Supabase's connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres) and [pgx v5 configuration](https://pkg.go.dev/github.com/jackc/pgx/v5).
