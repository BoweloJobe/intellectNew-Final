import { afterEach, describe, expect, it, vi } from "vitest";
import { clearStoredAuthSession, readStoredAuthSession, writeStoredAuthSession } from "./auth-storage";

const STORAGE_KEY = "intellectx.auth.session";

describe("auth-storage", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("writes and reads normalized sessions", () => {
    writeStoredAuthSession({
      user: {
        id: "u1",
        firstName: "User",
        lastName: "Example",
        displayName: "User",
        fullName: "User",
        email: "User@Test.COM",
        role: "student",
      },
    });

    const restored = readStoredAuthSession();
    expect(restored?.user.email).toBe("user@test.com");
  });

  it("returns null and clears invalid json", () => {
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");
    window.localStorage.setItem(STORAGE_KEY, "{ bad json");

    expect(readStoredAuthSession()).toBeNull();
    expect(removeSpy).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("returns null and clears invalid shape", () => {
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: { id: "only-id" } }));

    expect(readStoredAuthSession()).toBeNull();
    expect(removeSpy).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("clears stored session explicitly", () => {
    writeStoredAuthSession({
      user: {
        id: "u1",
        firstName: "User",
        lastName: "Example",
        displayName: "User",
        fullName: "User",
        email: "user@test.com",
        role: "student",
      },
    });

    clearStoredAuthSession();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
