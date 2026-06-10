import type { ActivityItem } from "../../models/activity";
import type { NotificationItem, NotificationPreferences } from "../../models/notifications";

export interface NotificationsService {
  getNotifications(): Promise<NotificationItem[]>;
  getActivityFeed(): Promise<ActivityItem[]>;
  getNotificationPreferences(): Promise<NotificationPreferences>;
  saveNotificationPreferences(input: NotificationPreferences): Promise<NotificationPreferences>;
  markRead(notificationId: string): Promise<void>;
  markAllRead(): Promise<void>;
}
