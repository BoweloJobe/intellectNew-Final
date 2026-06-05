import { useEffect } from "react";
import { readPersistedProductState } from "../../services/product-storage.service";
import { useCommunityState } from "../community/CommunityStateContext";
import { useCoursesState } from "../courses/CoursesStateContext";
import { useNotificationsState } from "../notifications/NotificationsStateContext";
import { useTutorState } from "../tutor/TutorStateContext";
import { useUiState } from "../ui/UiStateContext";

export function StateHydrationBootstrap() {
  const notifications = useNotificationsState();
  const courses = useCoursesState();
  const community = useCommunityState();
  const tutor = useTutorState();
  const ui = useUiState();

  useEffect(() => {
    const persistedState = readPersistedProductState();

    if (!persistedState) {
      return;
    }

    // Only restore frontend-owned fields. Backend-owned fields (enrollments,
    // progress, notifications list, activity, dashboard stats, study-group
    // membership) are intentionally omitted so the local store never acts as
    // authoritative truth for data that will come from the API.
    courses.hydrate({
      bookmarks: persistedState.bookmarks,
    });
    notifications.hydrate({
      notificationCenterPreferences: persistedState.notificationCenterPreferences,
    });
    community.hydrate({
      userPreferences: persistedState.favoriteTopics
        ? {
            ...community.state.userPreferences,
            favoriteTopics: persistedState.favoriteTopics,
          }
        : undefined,
      communityViewPreferences: persistedState.communityViewPreferences,
      communityDrafts: persistedState.communityDrafts,
    });
    tutor.hydrate({
      tutorSessions: persistedState.tutorSessions,
      activeTutorSessionId: persistedState.activeTutorSessionId,
    });
    ui.hydrate({ dismissedUiPrompts: persistedState.dismissedUiPrompts });
  }, []);

  return null;
}