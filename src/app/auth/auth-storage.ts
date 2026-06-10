import type { AuthSession } from "../services/contracts/auth.contract";
import { isAuthSession, normalizeAuthSession } from "./auth-normalizers";
import { logWarn } from "../utils/logger";

const AUTH_SESSION_STORAGE_KEY = "intellectx.auth.session";
export const AUTH_SESSION_CLEARED_EVENT = "intellectx:auth-session-cleared";

function getSafeLocalStorage(): Storage | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    logWarn("Local storage is unavailable for auth session", {
      operation: "auth.storage.get",
      error,
    });
    return null;
  }
}

export function readStoredAuthSession(): AuthSession | null {
  const storage = getSafeLocalStorage();

  if (!storage) {
    return null;
  }

  let raw: string | null = null;

  try {
    raw = storage.getItem(AUTH_SESSION_STORAGE_KEY);
  } catch (error) {
    logWarn("Failed to read auth session from storage", {
      operation: "auth.storage.read",
      error,
    });
    return null;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isAuthSession(parsed)) {
      clearStoredAuthSession();
      return null;
    }

    return normalizeAuthSession(parsed);
  } catch (error) {
    logWarn("Failed to parse auth session from storage", {
      operation: "auth.storage.parse",
      error,
    });
    clearStoredAuthSession();
    return null;
  }
}

export function writeStoredAuthSession(session: AuthSession): void {
  const storage = getSafeLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalizeAuthSession(session)));
  } catch (error) {
    logWarn("Failed to persist auth session to storage", {
      operation: "auth.storage.write",
      error,
    });
    // Ignore storage failures to keep auth flow functional.
  }
}

export function clearStoredAuthSession(): void {
  const storage = getSafeLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AUTH_SESSION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_CLEARED_EVENT));
  } catch (error) {
    logWarn("Failed to clear auth session from storage", {
      operation: "auth.storage.clear",
      error,
    });
    // Ignore storage failures to keep auth flow functional.
  }
}
