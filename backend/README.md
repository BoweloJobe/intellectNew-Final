# IntellectX Backend

Node.js + Express + TypeScript + Prisma backend for IntellectX.

## Prerequisites

- Node.js 20+
- SQLite for current local development (`DATABASE_URL="file:./dev.db"`)

PostgreSQL is the intended production database target, but that migration has not been implemented yet.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, and FRONTEND_URL in .env

# 3. Generate Prisma client
npm run db:generate

# 4. Run dev server
npm run dev
```

## Lesson Video Uploads

Instructor lesson video upload uses Supabase Storage signed upload URLs. Configure these backend environment variables to enable uploads:

- `STORAGE_PROVIDER=SUPABASE`
- `STORAGE_BUCKET=lesson-videos`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

When storage is not configured, upload endpoints return a clear "Video upload is not configured yet" error instead of returning fake upload URLs.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled production build |
| `npm run typecheck` | Type-check without emitting |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create/apply Prisma development migrations |
| `npm run db:migrate:deploy` | Apply committed migrations to a fresh or existing SQLite database |
| `npm run db:studio` | Open Prisma Studio |

## Database status

Prisma currently uses SQLite via `backend/prisma/schema.prisma`. The local default is `DATABASE_URL="file:./dev.db"`, and local `.db` files are ignored by git and must not be committed.

The committed SQLite migration chain is replayable for fresh development databases. Local prototype setup can still use Prisma Client generation and the existing local `prisma db push` flow, but `prisma db push` is not production-safe. Production should move to PostgreSQL with committed PostgreSQL migrations and `prisma migrate deploy`.

## Health endpoint

```
GET /api/health
```

Returns `{ status: "ok", timestamp: "...", service: "intellectx-api" }`.

## Project structure

```
src/
  index.ts          — Server entry point
  app/
    index.ts        — Express app factory
  config/
    env.ts          — Validated environment config
  routes/
    index.ts        — API route mounting
  controllers/      — Route handler functions
  services/         — Business logic (add per domain)
  middleware/
    error.middleware.ts  — 404 + error handlers
  lib/
    prisma.ts       — Prisma Client singleton
  types/
    express.d.ts    — Typed request extensions
prisma/
  schema.prisma     — Database schema
```
