import { describe, expect, it } from "vitest";
import { getCourseAuthoringReadiness } from "./InstructorCoursesPage";

describe("getCourseAuthoringReadiness", () => {
  it("allows course creation when courses are API-backed", () => {
    expect(getCourseAuthoringReadiness("api")).toEqual({
      isAvailable: true,
      isApiBacked: true,
      message: "",
    });
  });

  it("labels mock mode as local drafts instead of production persistence", () => {
    const readiness = getCourseAuthoringReadiness("mock");

    expect(readiness.isAvailable).toBe(true);
    expect(readiness.isApiBacked).toBe(false);
    expect(readiness.message).toContain("local in-memory drafts only");
    expect(readiness.message).toContain("API-backed courses");
  });
});
