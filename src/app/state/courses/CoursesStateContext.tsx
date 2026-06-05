import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  CourseLessonProgress,
  CourseStatus,
  RecentCourseAccess,
} from "../../models/courses";
import {
  completeCourseLesson as completeCourseLessonRequest,
  enrollCourse,
  getEnrolledCoursesProgress,
  trackCourseAccess,
} from "../../services/courses.service";

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, progress));
}

type CoursesState = {
  bookmarks: string[];
  enrolledCourseIds: string[];
  courseTitles: Record<string, string>;
  courseProgress: Record<string, number>;
  courseLessonProgress: Record<string, CourseLessonProgress>;
  recentlyAccessedCourses: RecentCourseAccess[];
};

type CompleteCourseLessonInput = {
  courseId: string;
  lessonId: string;
  totalLessons: number;
  nextLessonId: string | null;
};

type LocalOwnedCoursesHydration = {
  bookmarks?: string[];
};

type CoursesContextValue = {
  state: CoursesState;
  hydrate: (partial: LocalOwnedCoursesHydration) => void;
  reloadEnrollments: () => Promise<void>;
  toggleBookmark: (courseId: string) => boolean;
  setCourseProgress: (courseId: string, progress: number) => void;
  getCourseStatus: (courseId: string) => CourseStatus;
  getCourseProgressSummary: (courseId: string, totalLessons: number) => { completedLessons: number; totalLessons: number };
  markCourseAccessed: (courseId: string) => void;
  completeCourseLesson: (input: CompleteCourseLessonInput) => Promise<{ syncOk: boolean; completedDelta: number }>;
  joinCourse: (courseId: string) => Promise<{ syncOk: boolean; joinedNewCourse: boolean }>;
};

const CoursesStateContext = createContext<CoursesContextValue | null>(null);

export function CoursesProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [courseTitles, setCourseTitles] = useState<Record<string, string>>({});
  const [courseProgress, setCourseProgressState] = useState<Record<string, number>>({});
  const [courseLessonProgress, setCourseLessonProgress] = useState<Record<string, CourseLessonProgress>>({});
  const [recentlyAccessedCourses, setRecentlyAccessedCourses] = useState<RecentCourseAccess[]>([]);

  const value = useMemo<CoursesContextValue>(
    () => ({
      state: {
        bookmarks,
        enrolledCourseIds,
        courseTitles,
        courseProgress,
        courseLessonProgress,
        recentlyAccessedCourses,
      },
      hydrate: (partial) => {
        if (partial.bookmarks) {
          setBookmarks(partial.bookmarks);
        }
      },
      reloadEnrollments: async () => {
        try {
          const enrollments = await getEnrolledCoursesProgress();
          const newEnrolledCourseIds = enrollments.map((e) => e.courseId);
          const newCourseProgress: Record<string, number> = {};
          const newCourseLessonProgress: Record<string, CourseLessonProgress> = {};
          const newCourseTitles: Record<string, string> = {};

          for (const enrollment of enrollments) {
            newCourseProgress[enrollment.courseId] = enrollment.progress;
            newCourseLessonProgress[enrollment.courseId] = {
              completedLessonIds: enrollment.completedLessonIds,
              currentLessonId: enrollment.resumeLessonId,
              lastAccessedAt: enrollment.lastAccessedAt,
            };
            if (enrollment.courseTitle) {
              newCourseTitles[enrollment.courseId] = enrollment.courseTitle;
            }
          }

          setEnrolledCourseIds(newEnrolledCourseIds);
          setCourseProgressState(newCourseProgress);
          setCourseLessonProgress(newCourseLessonProgress);
          setCourseTitles(newCourseTitles);
        } catch {
          // Silently fail — app continues with empty enrollment state
        }
      },
      toggleBookmark: (courseId) => {
        const exists = bookmarks.includes(courseId);
        setBookmarks((previous) =>
          exists ? previous.filter((id) => id !== courseId) : [...previous, courseId],
        );
        return !exists;
      },
      setCourseProgress: (courseId, progress) => {
        setCourseProgressState((previous) => ({
          ...previous,
          [courseId]: clampProgress(progress),
        }));
      },
      getCourseStatus: (courseId) => {
        const enrolled = enrolledCourseIds.includes(courseId);
        const progress = courseProgress[courseId] ?? 0;

        if (!enrolled) {
          return "not-enrolled";
        }

        if (progress >= 100) {
          return "completed";
        }

        if (progress > 0) {
          return "in-progress";
        }

        return "enrolled";
      },
      getCourseProgressSummary: (courseId, totalLessons) => {
        const completedLessons =
          courseLessonProgress[courseId]?.completedLessonIds.length
          ?? Math.round(((courseProgress[courseId] ?? 0) / 100) * totalLessons);

        return {
          completedLessons: Math.min(totalLessons, completedLessons),
          totalLessons,
        };
      },
      markCourseAccessed: (courseId) => {
        const accessedAt = new Date().toISOString();

        setRecentlyAccessedCourses((previous) => [
          { courseId, lastAccessedAt: accessedAt },
          ...previous.filter((item) => item.courseId !== courseId),
        ].slice(0, 8));

        setCourseLessonProgress((previous) => ({
          ...previous,
          [courseId]: {
            completedLessonIds: previous[courseId]?.completedLessonIds ?? [],
            currentLessonId: previous[courseId]?.currentLessonId ?? null,
            lastAccessedAt: accessedAt,
          },
        }));

        void trackCourseAccess(courseId);
      },
      completeCourseLesson: async ({ courseId, lessonId, totalLessons, nextLessonId }) => {
        const previousProgress = courseProgress[courseId] ?? 0;
        const previous = courseLessonProgress[courseId] ?? {
          completedLessonIds: [],
          currentLessonId: null,
          lastAccessedAt: null,
        };
        const alreadyCompleted = previous.completedLessonIds.includes(lessonId);
        const completedLessonIds = alreadyCompleted
          ? previous.completedLessonIds
          : [...previous.completedLessonIds, lessonId];
        const nextProgress = clampProgress((completedLessonIds.length / totalLessons) * 100);
        const completedDelta = previousProgress < 100 && nextProgress === 100 ? 1 : 0;
        const accessedAt = new Date().toISOString();

        setEnrolledCourseIds((previous) => (previous.includes(courseId) ? previous : [...previous, courseId]));
        setCourseLessonProgress((previousState) => ({
          ...previousState,
          [courseId]: {
            completedLessonIds,
            currentLessonId: nextLessonId,
            lastAccessedAt: accessedAt,
          },
        }));
        setCourseProgressState((progressPrevious) => ({
          ...progressPrevious,
          [courseId]: nextProgress,
        }));

        setRecentlyAccessedCourses((previous) => [
          { courseId, lastAccessedAt: accessedAt },
          ...previous.filter((item) => item.courseId !== courseId),
        ].slice(0, 8));

        try {
          await completeCourseLessonRequest(courseId, lessonId);
          // Background reconciliation: pull fresh progress from the backend so
          // the optimistic update is overwritten by authoritative server state.
          // This runs without blocking the UI or propagating errors to the caller.
          void getEnrolledCoursesProgress()
            .then((enrollments) => {
              const updatedProgress: Record<string, number> = {};
              const updatedLessonProgress: Record<string, CourseLessonProgress> = {};
              const updatedTitles: Record<string, string> = {};
              for (const e of enrollments) {
                updatedProgress[e.courseId] = e.progress;
                updatedLessonProgress[e.courseId] = {
                  completedLessonIds: e.completedLessonIds,
                  currentLessonId: e.resumeLessonId,
                  lastAccessedAt: e.lastAccessedAt,
                };
                if (e.courseTitle) {
                  updatedTitles[e.courseId] = e.courseTitle;
                }
              }
              setEnrolledCourseIds(enrollments.map((e) => e.courseId));
              setCourseProgressState((prev) => ({ ...prev, ...updatedProgress }));
              setCourseLessonProgress((prev) => ({ ...prev, ...updatedLessonProgress }));
              setCourseTitles((prev) => ({ ...prev, ...updatedTitles }));
            })
            .catch(() => {
              // Silently ignore re-sync failures; optimistic state remains
            });
          return { syncOk: true, completedDelta };
        } catch {
          return { syncOk: false, completedDelta };
        }
      },
      joinCourse: async (courseId) => {
        const previousProgress = courseProgress[courseId] ?? 0;
        const joinedNewCourse = previousProgress === 0;
        const accessedAt = new Date().toISOString();

        setEnrolledCourseIds((previous) => (previous.includes(courseId) ? previous : [...previous, courseId]));
        setCourseProgressState((previous) => ({
          ...previous,
          [courseId]: previousProgress,
        }));
        setCourseLessonProgress((previous) => ({
          ...previous,
          [courseId]: {
            completedLessonIds: previous[courseId]?.completedLessonIds ?? [],
            currentLessonId: previous[courseId]?.currentLessonId ?? null,
            lastAccessedAt: accessedAt,
          },
        }));
        setRecentlyAccessedCourses((previous) => [
          { courseId, lastAccessedAt: accessedAt },
          ...previous.filter((item) => item.courseId !== courseId),
        ].slice(0, 8));

        try {
          await enrollCourse(courseId);
          return { syncOk: true, joinedNewCourse };
        } catch {
          return { syncOk: false, joinedNewCourse };
        }
      },
    }),
    [bookmarks, courseLessonProgress, courseProgress, courseTitles, enrolledCourseIds, recentlyAccessedCourses],
  );

  return <CoursesStateContext.Provider value={value}>{children}</CoursesStateContext.Provider>;
}

export function useCoursesState(): CoursesContextValue {
  const context = useContext(CoursesStateContext);

  if (!context) {
    throw new Error("useCoursesState must be used within CoursesProvider");
  }

  return context;
}
