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
- Set `DATABASE_URL` for the production database.
- Set a random `JWT_SECRET` with at least 32 characters.
- Set `FRONTEND_URL` to the deployed frontend origin for CORS.
- Set SMTP variables for password reset email delivery: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.
- Set lesson video storage variables before testing instructor uploads: `STORAGE_PROVIDER=SUPABASE`, `STORAGE_BUCKET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Configure PayPal variables only when payments are enabled in the deployment: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYPAL_PLAN_ID_MONTHLY`, and `PAYPAL_PLAN_ID_ANNUAL`.
- Run `npm run typecheck --prefix backend`, `npm test --prefix backend`, and `npm run build --prefix backend`.

## Database

- Current local development uses SQLite.
- Do not use `prisma db push` as a production migration process.
- Production database migration work should use committed Prisma migrations and `prisma migrate deploy`.

## Course And Video Testing

- Mock mode may create local in-memory drafts for UI testing, but it must not be treated as production persistence.
- Real course persistence and lesson video upload testing require API-backed courses.
- Start backend with valid auth, database, CORS, and storage env before testing signed lesson video uploads.
- Create a course draft, open it for editing, add at least one module and lesson, then upload the video from the lesson editor.
