import type { CommunityViewPreferences, DiscussionDraft } from "../models/community";
import type { TutorSession } from "../models/tutor";
import type { NotificationCenterPreferences } from "../models/notifications";

const PRODUCT_STORAGE_KEY = "intellect.product.state.v2";

/**
 * Only frontend-owned state is persisted here.
 * Backend-owned domains (enrollments, progress, notifications, activity,
 * dashboard aggregates, study-group membership) are intentionally excluded
 * so that the local store never acts as an authoritative source of truth
 * for data that will eventually be served by the API.
 */
export interface PersistedProductState {
  // course UI convenience
  bookmarks: string[];
  // notification UI preferences only
  notificationCenterPreferences: NotificationCenterPreferences;
  // community local state
  favoriteTopics: string[];
  communityViewPreferences: CommunityViewPreferences;
  communityDrafts: DiscussionDraft[];
  // AI tutor sessions (locally generated)
  tutorSessions: TutorSession[];
  activeTutorSessionId: string | null;
  // UI preferences
  dismissedUiPrompts: string[];
}

function readTutorSessions(value: unknown): TutorSession[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is TutorSession => {
    const objectValue = readObject(item);

    if (!objectValue || !isString(objectValue.id) || !isString(objectValue.title) || !isString(objectValue.updatedAt)) {
      return false;
    }

    if (objectValue.status !== "active" && objectValue.status !== "archived" && objectValue.status !== "pinned") {
      return false;
    }

    if (!Array.isArray(objectValue.tags) || !Array.isArray(objectValue.messages) || !Array.isArray(objectValue.takeaways)) {
      return false;
    }

    const validTags = objectValue.tags.every((tag) => {
      const tagObject = readObject(tag);
      return !!tagObject
        && isString(tagObject.id)
        && (tagObject.type === "course" || tagObject.type === "topic")
        && isString(tagObject.label);
    });

    const validMessages = objectValue.messages.every((message) => {
      const messageObject = readObject(message);
      return !!messageObject
        && isString(messageObject.id)
        && (messageObject.role === "user" || messageObject.role === "assistant")
        && isString(messageObject.content)
        && isString(messageObject.createdAt);
    });

    const validTakeaways = objectValue.takeaways.every(isString);

    return validTags && validMessages && validTakeaways;
  });
}

function getSafeLocalStorage(): Storage | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function safeRemoveCorruptState(storage: Storage): void {
  try {
    storage.removeItem(PRODUCT_STORAGE_KEY);
  } catch {
    // Ignore cleanup failures.
  }
}

function readNotificationCenterPreferences(value: unknown): NotificationCenterPreferences | null {
  const objectValue = readObject(value);

  if (!objectValue) {
    return null;
  }

  const filter = objectValue.filter;
  const sort = objectValue.sort;
  const groupMode = objectValue.groupMode;

  if (
    isString(objectValue.query)
    && (filter === "all" || filter === "unread" || filter === "read" || filter === "quiz" || filter === "course" || filter === "community" || filter === "achievement" || filter === "ai")
    && (sort === "newest" || sort === "oldest")
    && (groupMode === "recency" || groupMode === "type")
  ) {
    return {
      query: objectValue.query,
      filter,
      sort,
      groupMode,
    };
  }

  return null;
}

function readCommunityViewPreferences(value: unknown): CommunityViewPreferences | null {
  const objectValue = readObject(value);

  if (!objectValue) {
    return null;
  }

  if (
    isString(objectValue.searchQuery)
    && isString(objectValue.categoryFilter)
    && (objectValue.sortBy === "recent" || objectValue.sortBy === "most-liked" || objectValue.sortBy === "most-replies" || objectValue.sortBy === "trending")
  ) {
    return {
      searchQuery: objectValue.searchQuery,
      categoryFilter: objectValue.categoryFilter,
      sortBy: objectValue.sortBy,
    };
  }

  return null;
}

function readDiscussionDrafts(value: unknown): DiscussionDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is DiscussionDraft => {
    const objectValue = readObject(item);
    return !!objectValue
      && isString(objectValue.id)
      && isString(objectValue.title)
      && isString(objectValue.body)
      && isString(objectValue.createdAt)
      && isString(objectValue.updatedAt);
  });
}

export function readPersistedProductState(): Partial<PersistedProductState> | null {
  const storage = getSafeLocalStorage();

  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(PRODUCT_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedRaw = JSON.parse(rawValue) as unknown;
    const parsed = readObject(parsedRaw);

    if (!parsed) {
      safeRemoveCorruptState(storage);
      return null;
    }

    const result: Partial<PersistedProductState> = {};

    if (isStringArray(parsed.bookmarks)) {
      result.bookmarks = parsed.bookmarks;
    }

    if (isStringArray(parsed.favoriteTopics)) {
      result.favoriteTopics = parsed.favoriteTopics;
    }

    if (isStringArray(parsed.dismissedUiPrompts)) {
      result.dismissedUiPrompts = parsed.dismissedUiPrompts;
    }

    result.communityDrafts = readDiscussionDrafts(parsed.communityDrafts);
    result.tutorSessions = readTutorSessions(parsed.tutorSessions);

    if (parsed.activeTutorSessionId === null || isString(parsed.activeTutorSessionId)) {
      result.activeTutorSessionId = parsed.activeTutorSessionId;
    }

    const notificationCenterPreferences = readNotificationCenterPreferences(parsed.notificationCenterPreferences);
    if (notificationCenterPreferences) {
      result.notificationCenterPreferences = notificationCenterPreferences;
    }

    const communityViewPreferences = readCommunityViewPreferences(parsed.communityViewPreferences);
    if (communityViewPreferences) {
      result.communityViewPreferences = communityViewPreferences;
    }

    return result;
  } catch {
    safeRemoveCorruptState(storage);
    return null;
  }
}

export function clearPersistedProductState(): void {
  const storage = getSafeLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(PRODUCT_STORAGE_KEY);
  } catch {
    // Ignore cleanup failures.
  }
}

export function writePersistedProductState(value: PersistedProductState): void {
  const storage = getSafeLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage write failures and keep the frontend responsive.
  }
}
