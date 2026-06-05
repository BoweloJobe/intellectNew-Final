import { useEffect } from "react";
import { writePersistedProductState } from "../../services/product-storage.service";
import { useCommunityState } from "../community/CommunityStateContext";
import { useCoursesState } from "../courses/CoursesStateContext";
import { useNotificationsState } from "../notifications/NotificationsStateContext";
import { useTutorState } from "../tutor/TutorStateContext";
import { useUiState } from "../ui/UiStateContext";

export function StatePersistenceWriteback() {
  const notifications = useNotificationsState();
  const courses = useCoursesState();
  const community = useCommunityState();
  const tutor = useTutorState();
  const ui = useUiState();

  useEffect(() => {
    // Only persist frontend-owned state. Backend-owned fields (enrollments,
    // progress, notifications list, activity, dashboard stats, study-group
    // membership) are intentionally excluded so the local store never acts as
    // authoritative truth for data that will come from the API.
    writePersistedProductState({
      bookmarks: courses.state.bookmarks,
      notificationCenterPreferences: notifications.state.notificationCenterPreferences,
      favoriteTopics: community.state.userPreferences.favoriteTopics,
      communityViewPreferences: community.state.communityViewPreferences,
      communityDrafts: community.state.communityDrafts,
      tutorSessions: tutor.state.tutorSessions,
      activeTutorSessionId: tutor.state.activeTutorSessionId,
      dismissedUiPrompts: ui.state.dismissedUiPrompts,
    });
  }, [
    community.state.communityDrafts,
    community.state.communityViewPreferences,
    community.state.userPreferences.favoriteTopics,
    courses.state.bookmarks,
    notifications.state.notificationCenterPreferences,
    tutor.state.activeTutorSessionId,
    tutor.state.tutorSessions,
    ui.state.dismissedUiPrompts,
  ]);

  return null;
}