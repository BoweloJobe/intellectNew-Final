import type { ActivityItem } from "../models/activity";
import type { NotificationCategory, NotificationGroup, NotificationItem } from "../models/notifications";
import { getNotificationsService } from "./factory/service-registry";

export async function getNotifications(): Promise<NotificationItem[]> {
  return getNotificationsService().getNotifications();
}

export async function getActivityFeed(): Promise<ActivityItem[]> {
  return getNotificationsService().getActivityFeed();
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  return getNotificationsService().markRead(notificationId);
}

export async function markAllNotificationsRead(): Promise<void> {
  return getNotificationsService().markAllRead();
}

function getRecencyLabel(minutesAgo: number): NotificationGroup["label"] {
  if (minutesAgo < 1440) {
    return "Today";
  }

  if (minutesAgo < 10080) {
    return "Earlier this week";
  }

  return "Earlier";
}

export function groupNotificationsByRecency(notifications: NotificationItem[]): NotificationGroup[] {
  const groups = notifications.reduce<Map<string, NotificationItem[]>>((accumulator, item) => {
    const label = getRecencyLabel(item.minutesAgo);
    const existing = accumulator.get(label) ?? [];
    existing.push(item);
    accumulator.set(label, existing);
    return accumulator;
  }, new Map());

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items,
  }));
}

export function groupNotificationsByType(notifications: NotificationItem[]): NotificationGroup[] {
  const labelsByCategory: Record<NotificationCategory, string> = {
    quiz: "Quiz Reminders",
    course: "Course Updates",
    achievement: "Achievements",
    community: "Community",
    ai: "AI Tutor",
  };

  const groups = notifications.reduce<Map<NotificationCategory, NotificationItem[]>>((accumulator, item) => {
    const existing = accumulator.get(item.category) ?? [];
    existing.push(item);
    accumulator.set(item.category, existing);
    return accumulator;
  }, new Map());

  return Array.from(groups.entries()).map(([category, items]) => ({
    label: labelsByCategory[category],
    items,
  }));
}
