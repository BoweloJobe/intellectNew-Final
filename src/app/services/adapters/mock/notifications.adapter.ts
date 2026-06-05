import { activityMock, notificationsMock } from "../../../mocks/notifications.mock";
import type { NotificationsService } from "../../contracts/notifications.contract";
import { withMockDelay } from "../../mock-utils";

export class MockNotificationsAdapter implements NotificationsService {
  async getNotifications() {
    return withMockDelay(notificationsMock);
  }

  async getActivityFeed() {
    return withMockDelay(activityMock);
  }

  async markRead(_notificationId: string): Promise<void> {
    // No-op in mock mode
  }

  async markAllRead(): Promise<void> {
    // No-op in mock mode
  }
}