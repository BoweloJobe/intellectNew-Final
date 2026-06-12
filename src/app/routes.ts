import { createBrowserRouter } from "react-router-dom";
import { Layout } from "./layout/Layout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SignUpPage } from "./pages/SignUpPage";
import { StudentDashboard } from "./pages/StudentDashboard";
import { CoursesPage } from "./pages/CoursesPage";
import { CourseDetailsPage } from "./pages/CourseDetailsPage";
import { VideoLessonPage } from "./pages/VideoLessonPage";
import { QuizPage } from "./pages/QuizPage";
import { QuizDetailPage } from "./pages/QuizDetailPage";
import { ProgressPage } from "./pages/ProgressPage";
import { AITutorPage } from "./pages/AITutorPage";
import { InstructorDashboard } from "./pages/InstructorDashboard";
import { InstructorCoursesPage } from "./pages/InstructorCoursesPage";
import { InstructorQuizAuthoringPage } from "./pages/InstructorQuizAuthoringPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { PricingPage } from "./pages/PricingPage";
import { TermsPage } from "./pages/TermsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { CheckoutSuccessPage } from "./pages/CheckoutSuccessPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CommunityPage } from "./pages/CommunityPage";
import { NotesPage } from "./pages/NotesPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import { RouteErrorPage } from "./pages/RouteErrorPage";
import { ProtectedRoute, RoleProtectedRoute } from "./components/auth/ProtectedRoute";
import { ROLE_ROUTE_ALLOWLIST } from "./auth/access-control";
import { withErrorBoundary } from "./components/error/AppErrorBoundary";

const StudentDashboardWithBoundary = withErrorBoundary(StudentDashboard, { area: "student dashboard" });
const InstructorDashboardWithBoundary = withErrorBoundary(InstructorDashboard, { area: "instructor dashboard" });
const InstructorCoursesPageWithBoundary = withErrorBoundary(InstructorCoursesPage, { area: "instructor courses" });
const InstructorQuizAuthoringPageWithBoundary = withErrorBoundary(InstructorQuizAuthoringPage, { area: "instructor quiz authoring" });
const QuizDetailPageWithBoundary = withErrorBoundary(QuizDetailPage, { area: "quiz detail" });
const AdminDashboardWithBoundary = withErrorBoundary(AdminDashboard, { area: "admin dashboard" });
const CommunityPageWithBoundary = withErrorBoundary(CommunityPage, { area: "community" });
const AITutorPageWithBoundary = withErrorBoundary(AITutorPage, { area: "ai tutor" });
const VideoLessonPageWithBoundary = withErrorBoundary(VideoLessonPage, { area: "video lesson" });
const SettingsPageWithBoundary = withErrorBoundary(SettingsPage, { area: "settings" });

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    ErrorBoundary: RouteErrorPage,
    children: [
      { index: true, Component: LandingPage },
      { path: "login", Component: LoginPage },
      { path: "forgot-password", Component: ForgotPasswordPage },
      { path: "reset-password", Component: ResetPasswordPage },
      { path: "signup", Component: SignUpPage },
      { path: "pricing", Component: PricingPage },
      { path: "terms", Component: TermsPage },
      { path: "privacy", Component: PrivacyPage },
      { path: "unauthorized", Component: UnauthorizedPage },
      {
        Component: ProtectedRoute,
        children: [
          { path: "dashboard", Component: StudentDashboardWithBoundary },
          { path: "courses", Component: CoursesPage },
          { path: "courses/:id", Component: CourseDetailsPage },
          { path: "courses/:courseId/lessons/:lessonId", Component: VideoLessonPageWithBoundary },
          { path: "quizzes", Component: QuizPage },
          { path: "quizzes/:quizId", Component: QuizDetailPageWithBoundary },
          { path: "progress", Component: ProgressPage },
          { path: "ai-tutor", Component: AITutorPageWithBoundary },
          { path: "community", Component: CommunityPageWithBoundary },
          { path: "notes", Component: NotesPage },
          { path: "checkout", Component: CheckoutPage },
          { path: "checkout/success", Component: CheckoutSuccessPage },
          { path: "settings", Component: SettingsPageWithBoundary },
        ],
      },
      {
        Component: RoleProtectedRoute,
        children: [
          {
            path: "instructor",
            Component: InstructorDashboardWithBoundary,
            handle: { allowedRoles: ROLE_ROUTE_ALLOWLIST.instructor },
          },
          {
            path: "instructor/courses",
            Component: InstructorCoursesPageWithBoundary,
            handle: { allowedRoles: ROLE_ROUTE_ALLOWLIST.instructor },
          },
          {
            path: "instructor/quizzes/new",
            Component: InstructorQuizAuthoringPageWithBoundary,
            handle: { allowedRoles: ROLE_ROUTE_ALLOWLIST.instructor },
          },
          {
            path: "admin",
            Component: AdminDashboardWithBoundary,
            handle: { allowedRoles: ROLE_ROUTE_ALLOWLIST.admin },
          },
        ],
      },
    ],
  },
]);
