import { useMemo } from "react";
import { useCoursesState } from "../state/courses/CoursesStateContext";

export type CompletionCounts = {
  completed: number;
  inProgress: number;
  notStarted: number;
  total: number;
};

export type ProgressStats = {
  /** Number of enrolled courses that have reached 100% progress. */
  completionCounts: CompletionCounts;
  /** Estimated study hours derived from completed lessons (each lesson ≈ 20 min). */
  realStudyHours: number;
  /** Consecutive calendar days from recentlyAccessedCourses, starting from today or yesterday. */
  realCurrentStreak: number;
  /** Unique calendar days with course activity in the last 7 days. */
  studyDaysThisWeek: number;
};

/**
 * Single canonical source for all frontend-derived progress statistics.
 *
 * Both StudentDashboard and ProgressPage import this hook so that the same
 * computation path produces consistent numbers across every surface.
 *
 * All values are derived exclusively from CoursesStateContext so they stay
 * in sync with enrollments loaded from the backend.
 */
export function useProgressStats(): ProgressStats {
  const {
    state: { enrolledCourseIds, courseProgress, courseLessonProgress, recentlyAccessedCourses },
  } = useCoursesState();

  const completionCounts = useMemo<CompletionCounts>(() => {
    const enrolledProgress = enrolledCourseIds.map((id) =>
      Math.max(0, Math.min(100, courseProgress[id] ?? 0)),
    );
    const total = enrolledProgress.length;

    if (total === 0) {
      return { completed: 0, inProgress: 0, notStarted: 0, total: 0 };
    }

    const completed = enrolledProgress.filter((v) => v >= 100).length;
    const inProgress = enrolledProgress.filter((v) => v > 0 && v < 100).length;
    const notStarted = Math.max(0, total - completed - inProgress);

    return { completed, inProgress, notStarted, total };
  }, [enrolledCourseIds, courseProgress]);

  const realStudyHours = useMemo(() => {
    const totalCompletedLessons = Object.values(courseLessonProgress)
      .reduce((sum, p) => sum + p.completedLessonIds.length, 0);
    return Math.round(totalCompletedLessons * 20 / 60);
  }, [courseLessonProgress]);

  const realCurrentStreak = useMemo(() => {
    const uniqueDates = [
      ...new Set(
        recentlyAccessedCourses
          .filter((c) => c.lastAccessedAt)
          .map((c) => new Date(c.lastAccessedAt!).toDateString()),
      ),
    ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length === 0) return 0;

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 864e5).toDateString();

    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const gap = Math.round(
        (new Date(uniqueDates[i - 1]).getTime() - new Date(uniqueDates[i]).getTime()) / 864e5,
      );
      if (gap === 1) streak++;
      else break;
    }

    return streak;
  }, [recentlyAccessedCourses]);

  const studyDaysThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 864e5;
    return new Set(
      recentlyAccessedCourses
        .filter((c) => c.lastAccessedAt && new Date(c.lastAccessedAt).getTime() > weekAgo)
        .map((c) => new Date(c.lastAccessedAt!).toDateString()),
    ).size;
  }, [recentlyAccessedCourses]);

  return { completionCounts, realStudyHours, realCurrentStreak, studyDaysThisWeek };
}
