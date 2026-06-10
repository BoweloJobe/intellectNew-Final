import { activityMock, notificationsMock } from "../../../mocks/notifications.mock";
import type { NotificationPreferences } from "../../../models/notifications";
import type { NotificationsService } from "../../contracts/notifications.contract";
import { withMockDelay } from "../../mock-utils";

let mockNotificationPreferences: NotificationPreferences = {
  courseUpdates: true,
  quizReminders: true,
  assignmentDeadlines: true,
  communityActivity: false,
  weeklyProgressReport: true,
  emailNotifications: true,
};

export class MockNotificationsAdapter implements NotificationsService {
  async getNotifications() {
    return withMockDelay(notificationsMock);
  }

  async getActivityFeed() {
    return withMockDelay(activityMock);
  }

  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return withMockDelay({ ...mockNotificationPreferences });
  }

  async saveNotificationPreferences(input: NotificationPreferences): Promise<NotificationPreferences> {
    mockNotificationPreferences = { ...input };
    return withMockDelay({ ...mockNotificationPreferences });
  }

  async markRead(_notificationId: string): Promise<void> {
    // No-op in mock mode
  }

  async markAllRead(): Promise<void> {
    // No-op in mock mode
  }
}
