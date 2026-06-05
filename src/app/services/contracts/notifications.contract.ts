import type { ActivityItem } from "../../models/activity";
import type { NotificationItem } from "../../models/notifications";

export interface NotificationsService {
  getNotifications(): Promise<NotificationItem[]>;
  getActivityFeed(): Promise<ActivityItem[]>;
  markRead(notificationId: string): Promise<void>;
  markAllRead(): Promise<void>;
}