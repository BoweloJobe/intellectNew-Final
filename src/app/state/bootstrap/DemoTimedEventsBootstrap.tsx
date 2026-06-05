import { useEffect } from "react";
import { adapterMode } from "../../api/config/apiConfig";
import { useDashboardState } from "../dashboard/DashboardStateContext";
import {
  createProductNotification,
  useNotificationsState,
} from "../notifications/NotificationsStateContext";

export function DemoTimedEventsBootstrap() {
  const dashboard = useDashboardState();
  const notifications = useNotificationsState();

  useEffect(() => {
    // Synthetic demo events only fire in mock mode to simulate live activity.
    // In API mode the backend pushes real events; these timers must not run.
    if (adapterMode !== "mock") {
      return;
    }
    const quizTimer = window.setTimeout(() => {
      dashboard.setQuizReminder({
        hoursUntil: 18,
        subject: "Biology",
        topic: "Cell Structure",
        difficulty: "Medium",
      });
      notifications.pushNotification(
        createProductNotification({
          title: "Quiz due soon",
          detail: "Cell Structure is due in 18 hours.",
          category: "quiz",
          source: "quiz-reminder",
          actionLabel: "Review quiz",
          metadata: { hoursUntil: 18 },
        }),
      );
      notifications.addRecentActivity("dashboard", "Quiz reminder updated: Cell Structure in 18 hours");
    }, 8000);

    const repliesTimer = window.setTimeout(() => {
      dashboard.applyCommunityReplies(2);
      notifications.pushNotification(
        createProductNotification({
          title: "2 new replies",
          detail: "Your community threads picked up 2 new replies.",
          category: "community",
          source: "community-reply",
          actionLabel: "Open discussion",
          metadata: { replyCount: 2 },
        }),
      );
      notifications.addRecentActivity("community", "2 new replies arrived in your discussions");
    }, 12000);

    const badgeTimer = window.setTimeout(() => {
      notifications.pushNotification(
        createProductNotification({
          title: "Badge earned",
          detail: "You unlocked the Quick Study badge after your latest session.",
          category: "achievement",
          source: "badge-earned",
          metadata: { badgeName: "Quick Study" },
        }),
      );
      notifications.addRecentActivity("badge-earned", "Earned the Quick Study badge");
    }, 15000);

    const aiTimer = window.setTimeout(() => {
      notifications.pushNotification(
        createProductNotification({
          title: "Tutor suggestion",
          detail: "AI Tutor recommends a 10-minute review of Cell Structure before your next quiz.",
          category: "ai",
          source: "ai-tutor-recommendation",
          metadata: { suggestionTopic: "Cell Structure" },
        }),
      );
      notifications.addRecentActivity("ai-tutor", "AI Tutor suggested a Cell Structure refresher");
    }, 18000);

    return () => {
      window.clearTimeout(quizTimer);
      window.clearTimeout(repliesTimer);
      window.clearTimeout(badgeTimer);
      window.clearTimeout(aiTimer);
    };
  }, []);

  return null;
}