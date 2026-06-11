# IntellectX

Full-stack education platform — React + Vite frontend, Express + Prisma backend.

| Layer | Port | Start command |
|-------|------|--------------|
| Frontend | 5173 | `npm run dev:frontend` |
| Backend | 4000 | `npm run dev:backend` |

## Requirements

- Node.js `>=20`
- npm `>=10`

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
# Local backend development currently uses SQLite: DATABASE_URL="file:./dev.db"

# 4. Install backend dependencies + initialise the database
npm run setup
```

`npm run setup` does: `npm install` (root) → `npm install` (backend) → `prisma generate` → `prisma db push`.
This is a local prototype/development flow for the current SQLite schema. `prisma db push` is not production-safe.

> Re-run `npm run setup` any time you pull schema changes from git.

Current database reality: Prisma is configured for SQLite in `backend/prisma/schema.prisma`, using `DATABASE_URL="file:./dev.db"` from `backend/.env.example`. Local `.db` files are ignored and must not be committed.

The committed SQLite migration chain is replayable for fresh development databases with `npm run db:migrate:deploy --prefix backend`.

Production database target: PostgreSQL. PostgreSQL migration work remains separate future work. Production should eventually use Prisma migrations and `prisma migrate deploy`, not `prisma db push`.

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
| `DATABASE_URL` | ✅ | `file:./dev.db` locally | Current local SQLite URL. PostgreSQL is the planned production target, not active yet. |
| `JWT_SECRET` | ✅ | — | Must be ≥ 32 characters |
| `PORT` | | `4000` | Backend HTTP port |
| `FRONTEND_URL` | | `http://localhost:5173` | Used for CORS |
| `NODE_ENV` | | `development` | |

See `backend/.env.example` for the full list (SMTP, PayPal, storage, etc.).

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
