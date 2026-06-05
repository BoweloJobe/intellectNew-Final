import type { CommunityPageData } from "../../models/community";

export type UserPreferences = {
  emailNotifications: boolean;
  weeklyProgressReport: boolean;
  favoriteTopics: string[];
};

export type DashboardSummaryStats = {
  coursesEnrolled: number;
  completed: number;
  studyHours: number;
  currentStreak: number;
};

export type DashboardGoals = {
  studyHoursCompleted: number;
  studyHoursGoal: number;
  lessonsCompleted: number;
  lessonsGoal: number;
};

export type WeeklySnapshot = {
  averageQuizScore: number;
  studyDays: number;
  quizzesTaken: number;
  newReplies: number;
  /** Running per-subject average scores from quiz completions this session */
  quizScoresBySubject: Record<string, number>;
};

export type QuizReminder = {
  subject: string;
  topic: string;
  hoursUntil: number;
  difficulty: "Easy" | "Medium" | "Hard";
};

export type CommunitySummary = {
  discussionCount: number;
  joinedGroupsCount: number;
};

export type LiveDeltas = {
  streakDays: number;
  enrollments: number;
  savedItems: number;
  newReplies: number;
};

export type CommunityViewState = "loading" | "success" | "error";
export type TutorViewState = "loading" | "success" | "error";

export type AsyncViewError = string | null;

export const EMPTY_COMMUNITY_DATA: CommunityPageData = {
  discussions: [],
  studyGroups: [],
  popularTopics: [],
};
