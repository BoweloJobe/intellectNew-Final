import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  DashboardGoals,
  LiveDeltas,
  QuizReminder,
  WeeklySnapshot,
} from "../shared/types";

// dashboardSummary is intentionally omitted from DashboardState.
// Student-facing stats (enrolled courses, completed courses, study hours,
// streak) are now derived exclusively from CoursesStateContext via
// useProgressStats(). No mock-backed summary is loaded at mount.

type DashboardState = {
  /** Session-only progress toward the student's daily goal targets.
   *  The goal targets themselves (studyHoursGoal, lessonsGoal) are
   *  UI-defined constants in StudentDashboard — they are not stored here. */
  dashboardGoals: DashboardGoals;
  weeklySnapshot: WeeklySnapshot;
  quizReminder: QuizReminder;
  liveDeltas: LiveDeltas;
};

type DashboardContextValue = {
  state: DashboardState;
  setQuizReminder: (reminder: Partial<QuizReminder>) => void;
  applyCourseJoin: (joinedNewCourse: boolean) => void;
  applyLessonCompletion: (completedDelta: number) => void;
  applyCommunityReplies: (count: number) => void;
  applyBookmarkDelta: (delta: number) => void;
  /** Updates the running averageQuizScore in weeklySnapshot after each quiz submission. */
  applyQuizCompletion: (scorePercentage: number) => void;
  /** Updates the per-subject running average after each quiz submission. */
  applyQuizSubjectScore: (subject: string, scorePercentage: number) => void;
};

const DashboardStateContext = createContext<DashboardContextValue | null>(null);

const DEFAULT_STATE: DashboardState = {
  dashboardGoals: {
    studyHoursCompleted: 0,
    studyHoursGoal: 3,
    lessonsCompleted: 0,
    lessonsGoal: 5,
  },
  weeklySnapshot: {
    averageQuizScore: 0,
    studyDays: 0,
    quizzesTaken: 0,
    newReplies: 0,
    quizScoresBySubject: {},
  },
  quizReminder: {
    subject: "",
    topic: "",
    hoursUntil: 0,
    difficulty: "Medium",
  },
  liveDeltas: {
    streakDays: 0,
    enrollments: 0,
    savedItems: 0,
    newReplies: 0,
  },
};

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>(DEFAULT_STATE);

  const value = useMemo<DashboardContextValue>(
    () => ({
      state,
      setQuizReminder: (reminder) => {
        setState((previous) => ({
          ...previous,
          quizReminder: {
            ...previous.quizReminder,
            ...reminder,
          },
        }));
      },
      applyCourseJoin: (joinedNewCourse) => {
        if (!joinedNewCourse) {
          return;
        }

        setState((previous) => ({
          ...previous,
          liveDeltas: {
            ...previous.liveDeltas,
            enrollments: 1,
          },
        }));
      },
      applyLessonCompletion: (completedDelta) => {
        setState((previous) => ({
          ...previous,
          dashboardGoals: {
            ...previous.dashboardGoals,
            studyHoursCompleted: Math.min(
              previous.dashboardGoals.studyHoursGoal,
              previous.dashboardGoals.studyHoursCompleted + 1,
            ),
            lessonsCompleted: Math.min(
              previous.dashboardGoals.lessonsGoal,
              previous.dashboardGoals.lessonsCompleted + 1,
            ),
          },
          liveDeltas: {
            ...previous.liveDeltas,
            streakDays: completedDelta > 0
              ? previous.liveDeltas.streakDays + 1
              : previous.liveDeltas.streakDays,
          },
        }));
      },
      applyCommunityReplies: (count) => {
        setState((previous) => ({
          ...previous,
          weeklySnapshot: {
            ...previous.weeklySnapshot,
            newReplies: previous.weeklySnapshot.newReplies + count,
          },
          liveDeltas: {
            ...previous.liveDeltas,
            newReplies: count,
          },
        }));
      },
      applyBookmarkDelta: (delta) => {
        setState((previous) => ({
          ...previous,
          liveDeltas: {
            ...previous.liveDeltas,
            savedItems: previous.liveDeltas.savedItems + delta,
          },
        }));
      },
      applyQuizCompletion: (scorePercentage) => {
        setState((previous) => {
          const n = previous.weeklySnapshot.quizzesTaken;
          const oldAvg = previous.weeklySnapshot.averageQuizScore;
          const newAvg = Math.round((oldAvg * n + scorePercentage) / (n + 1));
          return {
            ...previous,
            weeklySnapshot: {
              ...previous.weeklySnapshot,
              quizzesTaken: n + 1,
              averageQuizScore: newAvg,
              // Each quiz session counts as a study day (capped to avoid exceeding 7)
              studyDays: Math.min(7, previous.weeklySnapshot.studyDays + 1),
            },
          };
        });
      },
      applyQuizSubjectScore: (subject, scorePercentage) => {
        setState((previous) => {
          const subjectScores = previous.weeklySnapshot.quizScoresBySubject;
          const existingScore = subjectScores[subject];
          // Running average: treat each call as a single new data point weighted equally
          // We don't track per-subject count, so use a simple moving average with weight 0.4/0.6
          // (new reading weighted higher so recent performance matters more)
          const newScore = existingScore !== undefined
            ? Math.round(existingScore * 0.6 + scorePercentage * 0.4)
            : scorePercentage;
          return {
            ...previous,
            weeklySnapshot: {
              ...previous.weeklySnapshot,
              quizScoresBySubject: {
                ...subjectScores,
                [subject]: newScore,
              },
            },
          };
        });
      },
    }),
    [state],
  );

  return <DashboardStateContext.Provider value={value}>{children}</DashboardStateContext.Provider>;
}

export function useDashboardState(): DashboardContextValue {
  const context = useContext(DashboardStateContext);

  if (!context) {
    throw new Error("useDashboardState must be used within DashboardProvider");
  }

  return context;
}
