# IntellectX

Full-stack education platform — React + Vite frontend, Express + Prisma backend.

| Layer | Port | Start command |
|-------|------|--------------|
| Frontend | 5173 | `npm run dev:frontend` |
| Backend | 4000 | `npm run dev:backend` |

## Requirements

- Node.js `>=20`
- npm `>=10`
- PostgreSQL 14+ for backend development and production

---

## First-time setup

```sh
# 1. Install root (frontend) dependencies
npm install

# 2. Copy frontend env
cp .env.example .env.local
# Edit .env.local if you want real backend integration (see "Connecting the backend" below)

# 3. Copy backend env and install backend dependencies
cp backend/.env.example backend/.env
# Edit backend/.env – at minimum set a real JWT_SECRET (>=32 chars)
# Set DATABASE_URL to PostgreSQL, for example:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/intellectx_dev?schema=public"

# 4. Install backend dependencies + apply committed migrations
npm run setup
```

`npm run setup` does: `npm install` (root) -> `npm install` (backend) -> `prisma generate` -> `prisma migrate deploy`.
Ensure the PostgreSQL database named in `backend/.env` exists before running setup.

> Re-run `npm run setup` any time you pull schema changes from git.

Current database reality: Prisma is configured for PostgreSQL in `backend/prisma/schema.prisma`. Production deployments must use a managed PostgreSQL database and run committed migrations with `npm run db:migrate:deploy --prefix backend`.

Migration history note: the repository now uses a clean PostgreSQL baseline because the previous SQLite migration chain was pre-production. This is not an in-place SQLite data migration path.


---

## Daily startup

```sh
# Start both frontend and backend with a single command:
npm run dev
```

Frontend → http://localhost:5173  
Backend API → http://localhost:4000/api

---

## Individual startup

```sh
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```

---

## Connecting the backend

By default the frontend uses **mock adapters** — it runs without a backend.  
To point it at the real API, edit `.env.local`:

```
VITE_SERVICE_ADAPTER_MODE=api
VITE_API_BASE_URL=http://localhost:4000/api
```

You can also enable individual domains independently (see `.env.example` for per-domain options).

Production builds must not silently use mock adapters. In production, every
service domain must resolve to `api`, or the build/runtime must explicitly set:

```
VITE_ALLOW_MOCK_IN_PRODUCTION=true
```

Use that override only for intentional demo/mock deployments.

For instructor course creation and lesson video upload testing, courses must be
API-backed. Use the global API mode above, or enable only the courses domain:

```
VITE_COURSES_ADAPTER_MODE=api
VITE_API_BASE_URL=http://localhost:4000/api
```

Mock mode can create local in-memory drafts for UI testing, but real
persistence and lesson video uploads require API mode.

---

## Type-checking

```sh
# Both frontend and backend (recommended before committing)
npm run typecheck

# Individually
npm run typecheck:frontend
npm run typecheck:backend
```

---

## Building

```sh
# Production frontend bundle (output: dist/)
npm run build
```

The backend is compiled with `npm run build --prefix backend` (output: `backend/dist/`).  
Frontend and backend builds are independent.

---

## Full verification gate

Runs typecheck + frontend tests + frontend build in one command:

```sh
npm run verify
```

---

## Backend env variables

Minimum required in `backend/.env`:

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | `postgresql://postgres:postgres@localhost:5432/intellectx_dev?schema=public` locally | PostgreSQL connection string. Production requires managed PostgreSQL. |
| `JWT_SECRET` | ✅ | — | Must be ≥ 32 characters |
| `PORT` | | `4000` | Backend HTTP port |
| `FRONTEND_URL` | | `http://localhost:5173` | Used for CORS |
| `NODE_ENV` | | `development` | |

See `backend/.env.example` for the full list (SMTP, PayPal, storage, etc.).

---

## Deployment readiness

See `DEPLOYMENT_READINESS.md` for the production env checklist, build/test
gates, and course/video testing readiness notes.

---

## Reliability checks

```sh
npm run typecheck   # strict TypeScript gate (frontend + backend)
npm run test        # frontend unit test suite
npm run build       # production bundle
npm run verify      # all three in sequence
```

Backend tests: `cd backend && npm test`

---

## Test isolation note

`VITE_*_ADAPTER_MODE` vars in `.env.local` are overridden by `.env.test` during `vitest` runs.  
Tests are always deterministic. Use `vi.stubEnv()` to pin specific values per test.
