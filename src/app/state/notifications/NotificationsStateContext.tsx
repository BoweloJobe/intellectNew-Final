import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ActivityItem, ActivityKind } from "../../models/activity";
import type {
  NotificationCategory,
  NotificationCenterPreferences,
  NotificationGroup,
  NotificationItem,
  NotificationSource,
} from "../../models/notifications";
import {
  getActivityFeed,
  getNotifications,
  groupNotificationsByRecency,
  groupNotificationsByType,
  markNotificationRead as serviceMarkRead,
  markAllNotificationsRead as serviceMarkAllRead,
} from "../../services/notifications.service";

function buildRelativeTimeLabel(minutesAgo: number): string {
  if (minutesAgo < 60) {
    return `${minutesAgo}m ago`;
  }

  if (minutesAgo < 1440) {
    return `${Math.round(minutesAgo / 60)}h ago`;
  }

  return `${Math.round(minutesAgo / 1440)}d ago`;
}

export function createProductNotification(input: {
  title: string;
  detail: string;
  category: NotificationCategory;
  source: NotificationSource;
  metadata?: NotificationItem["metadata"];
  actionLabel?: string;
}): NotificationItem {
  return {
    id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    detail: input.detail,
    category: input.category,
    source: input.source,
    createdAt: new Date().toISOString(),
    minutesAgo: 1,
    time: buildRelativeTimeLabel(1),
    read: false,
    dismissible: true,
    actionLabel: input.actionLabel,
    metadata: input.metadata,
  };
}

function createRecentActivity(kind: ActivityKind, message: string): ActivityItem {
  return {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    message,
    createdAt: new Date().toISOString(),
  };
}

const DEFAULT_PREFERENCES: NotificationCenterPreferences = {
  query: "",
  filter: "all",
  sort: "newest",
  groupMode: "recency",
};

type NotificationsState = {
  notifications: NotificationItem[];
  recentActivity: ActivityItem[];
  notificationCenterPreferences: NotificationCenterPreferences;
};

type NotificationsContextValue = {
  state: NotificationsState;
  /** Only UI preferences are persisted locally. Backend-owned notifications and
   * activity are loaded fresh from the service on mount and must not be hydrated
   * from local storage. */
  hydrate: (partial: { notificationCenterPreferences?: NotificationCenterPreferences }) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (notificationId: string) => void;
  pushNotification: (notification: NotificationItem) => void;
  addRecentActivity: (kind: ActivityKind, message: string) => void;
  unreadNotificationCount: number;
  notificationsByRecency: NotificationGroup[];
  notificationsByType: NotificationGroup[];
};

const NotificationsStateContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [notificationCenterPreferences, setNotificationCenterPreferences] =
    useState<NotificationCenterPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    void Promise.all([getNotifications(), getActivityFeed()]).then(([fetchedNotifications, activity]) => {
      setNotifications((previous) => (previous.length > 0 ? previous : fetchedNotifications));
      setRecentActivity((previous) => (previous.length > 0 ? previous : activity));
    });
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      state: {
        notifications,
        recentActivity,
        notificationCenterPreferences,
      },
      hydrate: (partial) => {
        if (partial.notificationCenterPreferences) {
          setNotificationCenterPreferences(partial.notificationCenterPreferences);
        }
      },
      markNotificationRead: (notificationId) => {
        setNotifications((previous) =>
          previous.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
        );
        void serviceMarkRead(notificationId).catch(() => { /* best-effort */ });
      },
      markAllNotificationsRead: () => {
        setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));
        void serviceMarkAllRead().catch(() => { /* best-effort */ });
      },
      dismissNotification: (notificationId) => {
        setNotifications((previous) => previous.filter((item) => item.id !== notificationId));
      },
      pushNotification: (notification) => {
        setNotifications((previous) => [notification, ...previous]);
      },
      addRecentActivity: (kind, message) => {
        setRecentActivity((previous) => [createRecentActivity(kind, message), ...previous].slice(0, 20));
      },
      unreadNotificationCount: notifications.filter((item) => !item.read).length,
      notificationsByRecency: groupNotificationsByRecency(notifications),
      notificationsByType: groupNotificationsByType(notifications),
    }),
    [notificationCenterPreferences, notifications, recentActivity],
  );

  return <NotificationsStateContext.Provider value={value}>{children}</NotificationsStateContext.Provider>;
}

export function useNotificationsState(): NotificationsContextValue {
  const context = useContext(NotificationsStateContext);

  if (!context) {
    throw new Error("useNotificationsState must be used within NotificationsProvider");
  }

  return context;
}
