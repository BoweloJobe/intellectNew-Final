export type NotificationCategory = "quiz" | "course" | "achievement" | "community" | "ai";

export type NotificationFilter = "all" | "unread" | "read" | NotificationCategory;

export type NotificationSort = "newest" | "oldest";

export type NotificationGroupMode = "recency" | "type";

export interface NotificationCenterPreferences {
  query: string;
  filter: NotificationFilter;
  sort: NotificationSort;
  groupMode: NotificationGroupMode;
}

export interface NotificationPreferences {
  courseUpdates: boolean;
  quizReminders: boolean;
  assignmentDeadlines: boolean;
  communityActivity: boolean;
  weeklyProgressReport: boolean;
  emailNotifications: boolean;
}

export type NotificationSource =
  | "quiz-reminder"
  | "course-update"
  | "badge-earned"
  | "community-reply"
  | "ai-tutor-recommendation";

export type NotificationRecencyGroup = "Today" | "Earlier this week" | "Earlier";

export interface NotificationMetadata {
  courseId?: string;
  badgeName?: string;
  hoursUntil?: number;
  replyCount?: number;
  suggestionTopic?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  category: NotificationCategory;
  source: NotificationSource;
  createdAt: string;
  minutesAgo: number;
  time: string;
  read: boolean;
  dismissible: boolean;
  actionLabel?: string;
  metadata?: NotificationMetadata;
}

export interface NotificationGroup {
  label: string;
  items: NotificationItem[];
}
