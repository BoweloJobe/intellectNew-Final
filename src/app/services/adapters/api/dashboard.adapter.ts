import type { DashboardService } from "../../contracts/dashboard.contract";
import type {
  AdminDashboardData,
  ContinueLearningItem,
  DashboardStat,
  InstructorDashboardData,
  StudentDashboardData,
} from "../../../models/dashboard";
import { httpClient, toApiError } from "../../../api";
import { readStoredAuthSession } from "../../../auth/auth-storage";

// ─── Backend response shapes ──────────────────────────────────────────────────

interface BackendEnrollmentCourse {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  thumbnailUrl: string | null;
  estimatedHours: number | null;
  instructor: { id: string; firstName: string; lastName: string };
}

interface BackendEnrollment {
  id: string;
  enrolledAt: string;
  completedAt: string | null;
  course: BackendEnrollmentCourse;
}

interface BackendCourseProgressData {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  completedAt: string | null;
  lessonProgress: Array<{ lessonId: string; completedAt: string }>;
}

type BackendEnrollmentsResponse = { status: string; data: { enrollments: BackendEnrollment[] } };
type BackendCourseProgressResponse = { status: string; data: { progress: BackendCourseProgressData } };
type BackendInstructorDashboardResponse = { status: string; data: InstructorDashboardData };
type BackendAdminDashboardResponse = { status: string; data: AdminDashboardData };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = readStoredAuthSession()?.tokens?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class ApiDashboardAdapter implements DashboardService {
  async getStudentDashboardData(): Promise<StudentDashboardData> {
    try {
      // Fetch all enrollments
      const enrollmentsResp = await httpClient.get<BackendEnrollmentsResponse>(
        "/enrollments/my",
        { headers: authHeaders() },
      );
      const enrollments = enrollmentsResp.data.enrollments;

      if (enrollments.length === 0) {
        return emptyStudentDashboard();
      }

      // Fetch per-course progress in parallel; tolerate individual failures
      const progressResults = await Promise.allSettled(
        enrollments.map((e) =>
          httpClient.get<BackendCourseProgressResponse>(
            `/enrollments/courses/${encodeURIComponent(e.course.id)}/progress`,
            { headers: authHeaders() },
          ),
        ),
      );

      let totalCompleted = 0;
      const totalEnrolled = enrollments.length;
      // One study-hour credit per course that has at least one lesson completed
      let studyHours = 0;

      const continueLearning: ContinueLearningItem[] = [];

      for (let i = 0; i < enrollments.length; i++) {
        const e = enrollments[i];
        const settled = progressResults[i];
        const p =
          settled.status === "fulfilled"
            ? settled.value.data.progress
            : null;

        const percentage = p?.percentage ?? 0;
        const completedLessons = p?.completedLessons ?? 0;

        if (e.completedAt || percentage >= 100) {
          totalCompleted++;
        }

        if (completedLessons > 0) {
          studyHours += Math.round(completedLessons * 20 / 60) || 1;
        }

        // Include in continue-learning if in-progress (not 100%)
        if (percentage < 100 && percentage >= 0) {
          continueLearning.push({
            courseId: e.course.id,
            resumeLessonId: "",
            title: e.course.title,
            progress: percentage,
            lesson: completedLessons > 0 ? `Lesson ${completedLessons + 1}` : "First lesson",
            duration: e.course.estimatedHours ? `${e.course.estimatedHours}h total` : "—",
          });
        }
      }

      const stats: DashboardStat[] = [
        { label: "Courses Enrolled", value: String(totalEnrolled), key: "courses-enrolled" },
        { label: "Completed", value: String(totalCompleted), key: "completed" },
        { label: "Study Hours", value: String(studyHours), key: "study-hours" },
        { label: "Current Streak", value: "0", key: "current-streak" },
      ];

      return {
        stats,
        // Sort by progress descending so the most-progressed course appears first
        continueLearning: continueLearning
          .sort((a, b) => b.progress - a.progress)
          .slice(0, 3),
        upcomingQuizzes: [],   // No backend scheduling endpoint
        recommendations: [],   // Derived from catalog in StudentDashboard component
      };
    } catch (error) {
      throw toApiError(error, { operation: "dashboard.getStudentDashboardData" });
    }
  }

  async getInstructorDashboardData(): Promise<InstructorDashboardData> {
    try {
      const resp = await httpClient.get<BackendInstructorDashboardResponse>(
        "/dashboard/instructor",
        { headers: authHeaders() },
      );
      return resp.data;
    } catch (error) {
      throw toApiError(error, { operation: "dashboard.getInstructorDashboardData" });
    }
  }

  async getAdminDashboardData(): Promise<AdminDashboardData> {
    try {
      const resp = await httpClient.get<BackendAdminDashboardResponse>(
        "/dashboard/admin",
        { headers: authHeaders() },
      );
      return resp.data;
    } catch (error) {
      throw toApiError(error, { operation: "dashboard.getAdminDashboardData" });
    }
  }
}

function emptyStudentDashboard(): StudentDashboardData {
  return {
    stats: [
      { label: "Courses Enrolled", value: "0", key: "courses-enrolled" },
      { label: "Completed", value: "0", key: "completed" },
      { label: "Study Hours", value: "0", key: "study-hours" },
      { label: "Current Streak", value: "0", key: "current-streak" },
    ],
    continueLearning: [],
    upcomingQuizzes: [],
    recommendations: [],
  };
}

