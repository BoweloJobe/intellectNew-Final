# IntellectX Backend

Node.js + Express + TypeScript + Prisma backend for IntellectX.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ for local development and production

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, and FRONTEND_URL in .env
# Example local DATABASE_URL:
# postgresql://postgres:postgres@localhost:5432/intellectx_dev?schema=public

# 3. Generate Prisma client
npm run db:generate

# 4. Apply committed migrations
npm run db:migrate:deploy

# 5. Run dev server
npm run dev
```

## Lesson Video Uploads

Instructor lesson video upload uses Supabase Storage signed upload URLs. Configure these backend environment variables to enable uploads:

- `ENABLE_VIDEO_UPLOADS=true`
- `STORAGE_PROVIDER=SUPABASE`
- `STORAGE_BUCKET=lesson-videos`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

In production, video uploads default to enabled and the backend fails startup if these values are missing. Set `ENABLE_VIDEO_UPLOADS=false` only for deployments where instructor lesson video uploads are intentionally unavailable.

Frontend course authoring must also be API-backed for upload testing. Set
`VITE_COURSES_ADAPTER_MODE=api` or `VITE_SERVICE_ADAPTER_MODE=api` with
`VITE_API_BASE_URL` pointing at this backend.

## Production Environment

Before production startup, configure:

- `NODE_ENV=production`
- `DATABASE_URL` for a managed PostgreSQL database
- `JWT_SECRET` with at least 32 characters
- `FRONTEND_URL` set to the deployed frontend origin
- `ENABLE_EMAIL_DELIVERY=true` plus SMTP variables for password reset email delivery
- `ENABLE_VIDEO_UPLOADS=true` plus Supabase/storage variables for instructor video uploads
- `ENABLE_PAYMENTS=true` plus PayPal variables for paid courses and checkout

The repository root `DEPLOYMENT_READINESS.md` has the full readiness checklist.

Production feature flags default to enabled when omitted. To intentionally ship a limited deployment, set a flag to `false`:

- `ENABLE_PAYMENTS=false` disables paid course checkout and payment capture.
- `ENABLE_VIDEO_UPLOADS=false` disables signed lesson video uploads.
- `ENABLE_EMAIL_DELIVERY=false` disables password reset/email delivery.

The backend only reports healthy after production env validation passes.

## Password Reset Email

Password reset links are delivered through SMTP. Configure these variables before production launch:

- `ENABLE_EMAIL_DELIVERY=true`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

If SMTP is missing while email delivery is enabled, production startup fails. Local development can opt into console reset-link logging only with `ALLOW_DEV_RESET_LINK_LOGGING=true`; that flag is rejected in production.

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
| `npm run db:migrate:deploy` | Apply committed migrations to a PostgreSQL database |
| `npm run db:studio` | Open Prisma Studio |

## Database status

Prisma uses PostgreSQL via `backend/prisma/schema.prisma`. Local development should point `DATABASE_URL` at a local PostgreSQL database; production must use managed PostgreSQL.

The committed migration chain is a clean PostgreSQL baseline because the previous SQLite migrations were pre-production. It is deployable to fresh PostgreSQL databases with `npm run db:migrate:deploy`. Do not use `prisma db push` for production.

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
