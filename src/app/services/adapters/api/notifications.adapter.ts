import type { NotificationsService } from "../../contracts/notifications.contract";
import type { ActivityItem } from "../../../models/activity";
import type { NotificationCategory, NotificationItem, NotificationSource } from "../../../models/notifications";
import { httpClient, toApiError } from "../../../api";
import { readStoredAuthSession } from "../../../auth/auth-storage";

// ─── Backend response shapes ──────────────────────────────────────────────────

interface BackendNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: string | null;  // JSON-serialised string or null
  isRead: boolean;
  createdAt: string;
}

interface BackendNotificationsResponse {
  data: {
    notifications: BackendNotification[];
    unreadCount: number;
  };
}

// ─── Type mappings ────────────────────────────────────────────────────────────

const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  ENROLLMENT_CONFIRMED: "course",
  COURSE_APPROVED:      "course",
  COURSE_REJECTED:      "course",
  QUIZ_PASSED:          "quiz",
  QUIZ_FAILED:          "quiz",
  SUBSCRIPTION_ACTIVATED: "course",
  SUBSCRIPTION_CANCELED:  "course",
  SUBSCRIPTION_EXPIRED:   "course",
};

const TYPE_TO_SOURCE: Record<string, NotificationSource> = {
  ENROLLMENT_CONFIRMED: "course-update",
  COURSE_APPROVED:      "course-update",
  COURSE_REJECTED:      "course-update",
  QUIZ_PASSED:          "quiz-reminder",
  QUIZ_FAILED:          "quiz-reminder",
  SUBSCRIPTION_ACTIVATED: "course-update",
  SUBSCRIPTION_CANCELED:  "course-update",
  SUBSCRIPTION_EXPIRED:   "course-update",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = readStoredAuthSession()?.tokens?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function minutesSince(isoString: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(isoString).getTime()) / 60_000));
}

function buildTimeLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

function mapBackendNotification(n: BackendNotification): NotificationItem {
  const minutesAgo = minutesSince(n.createdAt);
  const category: NotificationCategory = TYPE_TO_CATEGORY[n.type] ?? "course";
  const source: NotificationSource = TYPE_TO_SOURCE[n.type] ?? "course-update";

  let parsedMetadata: NotificationItem["metadata"] | undefined;
  if (n.metadata) {
    try {
      parsedMetadata = JSON.parse(n.metadata) as NotificationItem["metadata"];
    } catch {
      parsedMetadata = undefined;
    }
  }

  return {
    id: n.id,
    title: n.title,
    detail: n.body,
    category,
    source,
    createdAt: n.createdAt,
    minutesAgo,
    time: buildTimeLabel(minutesAgo),
    read: n.isRead,
    dismissible: true,
    metadata: parsedMetadata,
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class ApiNotificationsAdapter implements NotificationsService {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const response = await httpClient.get<BackendNotificationsResponse>(
        "/notifications/my",
        { headers: authHeaders() },
      );
      return response.data.notifications.map(mapBackendNotification);
    } catch (error) {
      throw toApiError(error, { operation: "notifications.getNotifications" });
    }
  }

  async getActivityFeed(): Promise<ActivityItem[]> {
    // The backend has no dedicated activity-feed endpoint — return empty array.
    return Promise.resolve([]);
  }

  async markRead(notificationId: string): Promise<void> {
    try {
      await httpClient.patch(
        `/notifications/${encodeURIComponent(notificationId)}/read`,
        { headers: authHeaders() },
      );
    } catch (error) {
      throw toApiError(error, { operation: "notifications.markRead" });
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await httpClient.post(
        "/notifications/read-all",
        { headers: authHeaders() },
      );
    } catch (error) {
      throw toApiError(error, { operation: "notifications.markAllRead" });
    }
  }
}
