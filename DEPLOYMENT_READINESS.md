# IntellectX Deployment Readiness Checklist

Use this as a pre-launch checklist. It documents readiness only; it does not deploy the app.

## Frontend

- Set `VITE_SERVICE_ADAPTER_MODE=api` for real production.
- Set `VITE_API_BASE_URL` to the production backend API root, for example `https://api.example.com/api`.
- Keep `VITE_ALLOW_MOCK_IN_PRODUCTION=false` unless intentionally shipping a demo/mock build.
- For instructor course creation and video-upload testing against a real backend, ensure the courses domain resolves to API mode. Either set the global mode to `api` or set `VITE_COURSES_ADAPTER_MODE=api`.
- Run `npm run typecheck`, `npm test -- --run`, and `npm run build`.

## Backend

- Set `NODE_ENV=production`.
- Provision a managed PostgreSQL database.
- Set `DATABASE_URL` to the managed PostgreSQL connection string.
- Set a random `JWT_SECRET` with at least 32 characters.
- Set `FRONTEND_URL` to the deployed frontend origin for CORS.
- Set `ENABLE_EMAIL_DELIVERY=true` and SMTP variables for password reset email delivery: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.
- Set `ENABLE_VIDEO_UPLOADS=true` and lesson video storage variables before testing instructor uploads: `STORAGE_PROVIDER=SUPABASE`, `STORAGE_BUCKET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Set `ENABLE_PAYMENTS=true` and PayPal variables when payments are enabled in the deployment: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_MODE`.
- To intentionally disable a feature in production, set `ENABLE_PAYMENTS=false`, `ENABLE_VIDEO_UPLOADS=false`, or `ENABLE_EMAIL_DELIVERY=false`; the matching checkout, signed-upload, or email/password-reset capability is unavailable.
- Run `npm run db:migrate:deploy --prefix backend` before starting the production backend.
- Create the first admin after migrations with `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional `ADMIN_NAME`:
  `npm run admin:bootstrap --prefix backend`.
- Use `ADMIN_PROMOTE_EXISTING=true` or `--promote-existing` only when intentionally promoting an existing non-admin user with the same email.
- Use unique staging and production admin credentials. The bootstrap command never prints the password.
- After startup, run the backend health check at `/api/health`. A healthy response means backend startup config validation passed.
- Verify admin login through the normal auth flow and confirm the admin dashboard is reachable.
- Run `npm run typecheck --prefix backend`, `npm test --prefix backend`, and `npm run build --prefix backend`.

## Database

- Prisma uses PostgreSQL.
- Production requires managed PostgreSQL; do not deploy with local files or ephemeral database storage.
- Do not use `prisma db push` as a production migration process.
- Use committed Prisma migrations and `npm run db:migrate:deploy --prefix backend`.
- The current migration chain is a clean PostgreSQL baseline because the previous SQLite migrations were pre-production. It is not an in-place SQLite data migration.

## Remaining Production Risks

- PayPal subscription plan IDs remain optional because current subscription checkout does not call PayPal subscriptions yet; configure them before enabling live subscription checkout URLs.

## Course And Video Testing

- Mock mode may create local in-memory drafts for UI testing, but it must not be treated as production persistence.
- Real course persistence and lesson video upload testing require API-backed courses.
- Start backend with valid auth, database, CORS, and storage env before testing signed lesson video uploads.
- Create a course draft, open it for editing, add at least one module and lesson, then upload the video from the lesson editor.
