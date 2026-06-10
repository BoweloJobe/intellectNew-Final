import type { ActivityItem } from "../models/activity";
import type { NotificationItem } from "../models/notifications";

/**
 * Empty mock data for notifications.
 * 
 * In mock mode, we return no demo/fake notifications or activity.
 * Users will see "No notifications yet" when there are none.
 * Real notifications are loaded from the backend in API mode.
 */
export const notificationsMock: NotificationItem[] = [];

export const activityMock: ActivityItem[] = [];
