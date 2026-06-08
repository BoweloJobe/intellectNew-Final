import { describe, expect, it } from "vitest";
import { isAuthSession, isAuthUser, normalizeAuthSession, normalizeAuthUser } from "./auth-normalizers";

const validUser = {
  id: "u1",
  firstName: "Test",
  lastName: "User",
  displayName: "Test",
  fullName: "Test User",
  email: "TeSt@Example.com",
  role: "student",
  institution: "Test Academy",
  learningGoal: "Finish onboarding",
  bio: "Finish onboarding",
} as const;

describe("auth-normalizers", () => {
  it("validates auth user shape", () => {
    expect(isAuthUser(validUser)).toBe(true);
    expect(isAuthUser({ ...validUser, role: "guest" })).toBe(false);
    expect(isAuthUser({ ...validUser, email: "" })).toBe(false);
  });

  it("normalizes auth user email", () => {
    expect(normalizeAuthUser(validUser).email).toBe("test@example.com");
  });

  it("normalizes onboarding user profile fields", () => {
    const normalized = normalizeAuthUser({
      ...validUser,
      firstName: " Test ",
      lastName: " User ",
      displayName: " T ",
      institution: " Test Academy ",
      learningGoal: "",
      bio: " Keep going ",
    });

    expect(normalized.firstName).toBe("Test");
    expect(normalized.lastName).toBe("User");
    expect(normalized.displayName).toBe("T");
    expect(normalized.institution).toBe("Test Academy");
    expect(normalized.learningGoal).toBe("Keep going");
    expect(normalized.bio).toBe("Keep going");
  });

  it("validates auth session shape", () => {
    expect(isAuthSession({ user: validUser })).toBe(true);
    expect(
      isAuthSession({
        user: validUser,
        tokens: {
          accessToken: "a",
          refreshToken: "b",
          expiresAt: "2026-01-01T00:00:00.000Z",
          sessionId: "s1",
        },
      }),
    ).toBe(true);
    expect(isAuthSession({ user: validUser, tokens: { accessToken: 42 } })).toBe(false);
    expect(isAuthSession({ user: { ...validUser, role: "guest" } })).toBe(false);
  });

  it("normalizes session user data", () => {
    const normalized = normalizeAuthSession({ user: validUser });
    expect(normalized.user.email).toBe("test@example.com");
  });
});
