import type { AuthSession, AuthUser } from "../services/contracts/auth.contract";
import { isAuthRole } from "./access-control";
import { normalizeEmailInput } from "../utils/form-validation";

export function normalizeEmail(email: string): string {
  return normalizeEmailInput(email);
}

export function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeUser = value as Partial<AuthUser>;

  return (
    typeof maybeUser.id === "string" &&
    maybeUser.id.length > 0 &&
    typeof maybeUser.fullName === "string" &&
    maybeUser.fullName.trim().length > 0 &&
    typeof maybeUser.email === "string" &&
    maybeUser.email.trim().length > 0 &&
    (maybeUser.firstName === undefined || typeof maybeUser.firstName === "string") &&
    (maybeUser.lastName === undefined || typeof maybeUser.lastName === "string") &&
    (maybeUser.displayName === undefined || typeof maybeUser.displayName === "string") &&
    (maybeUser.subscriptionTier === undefined || maybeUser.subscriptionTier === "free" || maybeUser.subscriptionTier === "pro") &&
    (maybeUser.institution === undefined || typeof maybeUser.institution === "string") &&
    (maybeUser.learningGoal === undefined || typeof maybeUser.learningGoal === "string") &&
    (maybeUser.bio === undefined || typeof maybeUser.bio === "string") &&
    isAuthRole(maybeUser.role)
  );
}

export function normalizeAuthUser(user: AuthUser): AuthUser {
  const normalizedFullName = user.fullName.trim();
  const fallbackNameParts = normalizedFullName.split(/\s+/).filter(Boolean);
  const normalizedFirstName = user.firstName?.trim() || fallbackNameParts[0] || normalizedFullName;
  const normalizedLastName = user.lastName?.trim() || fallbackNameParts.slice(1).join(" ");
  const normalizedDisplayName = user.displayName?.trim() || normalizedFirstName;

  return {
    ...user,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    displayName: normalizedDisplayName,
    fullName: normalizedFullName,
    email: normalizeEmail(user.email),
    subscriptionTier: user.subscriptionTier === "pro" ? "pro" : user.subscriptionTier === "free" ? "free" : undefined,
    institution: user.institution?.trim() || undefined,
    learningGoal: user.learningGoal?.trim() || user.bio?.trim() || undefined,
    bio: user.bio?.trim() || undefined,
  };
}

export function getAuthUserGreetingName(user: AuthUser | null | undefined): string {
  if (!user) {
    return "there";
  }

  const normalized = normalizeAuthUser(user);
  return normalized.displayName || normalized.firstName || normalized.fullName;
}

export function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeSession = value as { user?: unknown; tokens?: unknown };

  if (!isAuthUser(maybeSession.user)) {
    return false;
  }

  if (maybeSession.tokens === undefined) {
    return true;
  }

  if (!maybeSession.tokens || typeof maybeSession.tokens !== "object") {
    return false;
  }

  const maybeTokens = maybeSession.tokens as {
    accessToken?: unknown;
    refreshToken?: unknown;
    expiresAt?: unknown;
    sessionId?: unknown;
  };

  const accessTokenValid = maybeTokens.accessToken === undefined || typeof maybeTokens.accessToken === "string";
  const refreshTokenValid = maybeTokens.refreshToken === undefined || typeof maybeTokens.refreshToken === "string";
  const expiresAtValid = maybeTokens.expiresAt === undefined || typeof maybeTokens.expiresAt === "string";
  const sessionIdValid = maybeTokens.sessionId === undefined || typeof maybeTokens.sessionId === "string";

  return accessTokenValid && refreshTokenValid && expiresAtValid && sessionIdValid;
}

export function normalizeAuthSession(session: AuthSession): AuthSession {
  return {
    user: normalizeAuthUser(session.user),
    tokens: session.tokens,
  };
}
