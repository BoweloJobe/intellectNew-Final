export type ActivityKind =
  | "dashboard"
  | "course"
  | "community"
  | "lesson-completed"
  | "course-joined"
  | "badge-earned"
  | "community-reply"
  | "ai-tutor"
  | "quiz-reminder"
  | "quiz-completed";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  message: string;
  createdAt: string;
}
