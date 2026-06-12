import { describe, expect, it } from "vitest";
import { getNavbarLinks, shouldShowAuthenticatedNav } from "./Navbar";

describe("getNavbarLinks", () => {
  it("does not expose authenticated navbar links before a session is restored", () => {
    expect(getNavbarLinks(null, false)).toEqual([]);
    expect(getNavbarLinks("student", false)).toEqual([]);
  });

  it("keeps Pricing out of instructor and admin authenticated nav", () => {
    expect(getNavbarLinks("instructor", true).map((link) => link.name)).not.toContain("Pricing");
    expect(getNavbarLinks("admin", true).map((link) => link.name)).not.toContain("Pricing");
  });

  it("keeps admin nav focused on dashboard and review instead of student catalog links", () => {
    const adminLinks = getNavbarLinks("admin", true).map((link) => link.name);
    expect(adminLinks).toEqual(["Dashboard", "Review Queue", "Community"]);
    expect(adminLinks).not.toContain("Courses");
    expect(adminLinks).not.toContain("Learn");
    expect(adminLinks).not.toContain("My Learning");
    expect(adminLinks).not.toContain("Pricing");
  });

  it("keeps Pricing available for student authenticated nav", () => {
    expect(getNavbarLinks("student", true).map((link) => link.name)).toContain("Pricing");
  });

  it("exposes standalone quiz authoring for instructors", () => {
    expect(getNavbarLinks("instructor", true).map((link) => link.name)).toContain("Quizzes");
    expect(getNavbarLinks("instructor", true).find((link) => link.name === "Quizzes")?.path).toBe(
      "/instructor/quizzes/new",
    );
  });
});

describe("shouldShowAuthenticatedNav", () => {
  it("hides authenticated chrome while auth is restoring", () => {
    expect(shouldShowAuthenticatedNav(false, true)).toBe(false);
    expect(shouldShowAuthenticatedNav(true, true)).toBe(false);
  });

  it("shows authenticated chrome only after a valid restored session", () => {
    expect(shouldShowAuthenticatedNav(true, false)).toBe(true);
    expect(shouldShowAuthenticatedNav(false, false)).toBe(false);
  });
});
