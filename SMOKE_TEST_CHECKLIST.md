# IntellectX Smoke-Test Checklist

Use this checklist for a practical manual pass before launch or demo builds.

## Startup

- Install dependencies at the repo root and backend if needed.
- Start the app with `npm run dev`.
- Confirm the frontend loads at `http://localhost:5173`.
- Confirm the backend health endpoint returns OK at `http://localhost:4000/api/health`.
- For API-backed testing, set `VITE_SERVICE_ADAPTER_MODE=api` or the needed domain override plus `VITE_API_BASE_URL=http://localhost:4000/api`.

## Login And Signup

- Sign up with a new student account.
- Log out and log back in with that account.
- Confirm the dashboard loads without auth errors.
- Confirm an invalid login shows a clear error.

## Instructor Course Authoring

- Log in as an instructor or admin.
- Open Instructor Courses.
- Create a new course draft.
- In mock mode, confirm the success message explains the draft is local/in-memory and the draft shows in the course list.
- In API mode, confirm the success message appears and the backend-backed draft shows in the course list.
- Edit the draft and add a module.
- Add a lesson with title, description, duration, notes, and estimated completion time.
- Save and confirm the module/lesson appears when editing the draft again.

## Payment And Enrollment

- Open an approved free course and enroll directly.
- Confirm free enrollment succeeds without checkout.
- Open an approved paid course and click enroll/buy.
- Confirm the app starts provider checkout instead of enrolling immediately.
- Cancel or return without provider order data and confirm enrollment is not completed.
- Complete a provider-approved payment and confirm enrollment unlocks only after backend capture succeeds.
- As an unenrolled student, confirm paid lessons remain locked while free-preview lessons still open.
- Confirm `backend/.env.example` payment variables are set for payment-enabled environments.

## Instructor Quiz Authoring

- From a lesson, add a quiz question.
- For MCQ, mark exactly one option as correct and save.
- For short answer, add grading keywords such as `photosynthesis, chlorophyll`.
- Create a standalone quiz from the instructor dashboard.
- Confirm invalid questions show validation errors without requiring a second click.

## Student Quiz Taking

- Log in as a student with access to the quiz.
- Start an MCQ quiz and select the correct answer.
- Submit and confirm the result marks only the correct option as correct.
- Start a short-answer quiz and answer with matching keywords in different casing.
- Confirm matched keywords and score appear in the result.
- For timed quizzes, confirm a visible countdown appears.
- For untimed quizzes, confirm the quiz clearly says `Untimed quiz`.

## AI Tutor

- In mock mode, open AI Tutor and confirm the page clearly labels responses as demo/local mock behavior.
- Send a tutor prompt in mock mode and confirm the assistant response itself is labeled as a demo response.
- In API mode without a configured tutor backend/provider, confirm AI Tutor shows an unavailable/configuration message instead of a fake answer.
- In production-like builds, confirm mock tutor mode is blocked unless `VITE_ALLOW_MOCK_IN_PRODUCTION=true` is intentionally set for a demo build.

## Legal Pages

- Open `/terms` and `/privacy` from the footer.
- Confirm each page starts at the top on normal navigation.
- Confirm browser back/forward scroll restoration still feels normal.

## Password Reset

- Request a password reset from the login flow.
- In development, use configured SMTP or approved local reset-link logging.
- In production-like env, confirm missing SMTP fails closed and does not reveal reset links.

## Video Upload

- In mock mode, create a local draft course, add a module, add a lesson, and confirm the video upload UI is reachable.
- In mock mode, attempt lesson video upload and confirm the app says API mode and configured storage are required.
- In API mode without storage configured, attempt lesson video upload and confirm the app shows a clear storage-not-configured failure.
- In API mode with storage configured, create or edit a course lesson, upload a supported video file, and confirm the signed upload flow moves the lesson to a ready/uploaded state.
- Confirm manual video URL entry remains a fallback and is not required for the signed upload flow.
