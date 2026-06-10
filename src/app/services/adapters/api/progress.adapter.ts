import type { ProgressService } from "../../contracts/progress.contract";
import type {
  CompletionSplitDataPoint,
  ProgressPageData,
  SubjectMasteryDataPoint,
} from "../../../models/progress";
import { httpClient, toApiError } from "../../../api";

// ─── Backend response shapes ──────────────────────────────────────────────────

interface BackendEnrollmentCourse {
  id: string;
  category: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECT_COLORS = ["#4a9ff5", "#0d6efd", "#6bb6ff", "#2e8ef7", "#93c5fd"] as const;

const EMPTY_PROGRESS_DATA: ProgressPageData = {
  weeklyData: [],
  monthlyScores: [],
  subjectMastery: [],
  pieData: [
    { name: "Completed", value: 0, color: "#4a9ff5" },
    { name: "In Progress", value: 0, color: "#6bb6ff" },
    { name: "Not Started", value: 100, color: "#e5e7eb" },
  ],
  stats: [],
  strengths: [],
  focusAreas: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSubjectMastery(
  categoryProgressMap: Map<string, number[]>,
): SubjectMasteryDataPoint[] {
  return Array.from(categoryProgressMap.entries()).map(([subject, values], i) => ({
    subject,
    value: Math.round(values.reduce((acc, v) => acc + v, 0) / values.length),
    color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }));
}

function buildPieData(percentages: number[]): CompletionSplitDataPoint[] {
  const total = percentages.length;
  if (total === 0) {
    return EMPTY_PROGRESS_DATA.pieData;
  }

  const completed = percentages.filter((p) => p >= 100).length;
  const inProgress = percentages.filter((p) => p > 0 && p < 100).length;
  const notStarted = Math.max(0, total - completed - inProgress);

  return [
    { name: "Completed", value: Math.round((completed / total) * 100), color: "#4a9ff5" },
    { name: "In Progress", value: Math.round((inProgress / total) * 100), color: "#6bb6ff" },
    { name: "Not Started", value: Math.round((notStarted / total) * 100), color: "#e5e7eb" },
  ];
}

function buildStrengths(mastery: SubjectMasteryDataPoint[]): string[] {
  const high = mastery.filter((m) => m.value >= 75).sort((a, b) => b.value - a.value);
  if (high.length === 0) {
    return mastery.length > 0
      ? ["Keep studying to build your mastery scores."]
      : ["Complete courses to generate strength insights."];
  }
  return high.map((m) => `Strong performance in ${m.subject} (${m.value}% mastery)`);
}

function buildFocusAreas(mastery: SubjectMasteryDataPoint[]): string[] {
  const low = mastery.filter((m) => m.value < 75).sort((a, b) => a.value - b.value);
  if (low.length === 0) {
    return mastery.length > 0
      ? ["Great work — all subjects are above 75% mastery."]
      : ["Enroll in courses to discover areas for improvement."];
  }
  return low.map((m) => `Review ${m.subject} fundamentals to close the ${100 - m.value}% gap`);
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class ApiProgressAdapter implements ProgressService {
  async getProgressPageData(): Promise<ProgressPageData> {
    try {
      // 1. Fetch all enrollments for the current user
      const enrollmentsResp = await httpClient.get<BackendEnrollmentsResponse>(
        "/enrollments/my",
      );
      const enrollments = enrollmentsResp.data.enrollments;

      if (enrollments.length === 0) {
        return EMPTY_PROGRESS_DATA;
      }

      // 2. Fetch per-course lesson progress in parallel; tolerate individual failures
      const progressResults = await Promise.allSettled(
        enrollments.map((e) =>
          httpClient.get<BackendCourseProgressResponse>(
            `/enrollments/courses/${encodeURIComponent(e.course.id)}/progress`,
          ),
        ),
      );

      // 3. Map category → array of completion percentages
      const categoryProgressMap = new Map<string, number[]>();
      const allPercentages: number[] = [];

      for (let i = 0; i < enrollments.length; i++) {
        const category = enrollments[i].course.category || "Other";
        const settled = progressResults[i];
        const percentage =
          settled.status === "fulfilled"
            ? settled.value.data.progress.percentage
            : 0;

        allPercentages.push(percentage);

        const existing = categoryProgressMap.get(category) ?? [];
        existing.push(percentage);
        categoryProgressMap.set(category, existing);
      }

      const subjectMastery = buildSubjectMastery(categoryProgressMap);

      return {
        // No time-series data available from backend yet — charts show empty state
        weeklyData: [],
        monthlyScores: [],
        subjectMastery,
        pieData: buildPieData(allPercentages),
        // ProgressPage already derives stats from DashboardState when available
        stats: [],
        strengths: buildStrengths(subjectMastery),
        focusAreas: buildFocusAreas(subjectMastery),
      };
    } catch (error) {
      throw toApiError(error, { operation: "progress.getProgressPageData" });
    }
  }
}
