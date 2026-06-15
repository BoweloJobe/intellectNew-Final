import { describe, expect, it } from "vitest";
import { getCourseAccessDecision } from "./course-access";

describe("getCourseAccessDecision", () => {
  it("allows unenrolled students to access explicit free preview lessons", () => {
    expect(
      getCourseAccessDecision({
        courseStatus: "not-enrolled",
        role: "student",
        isFreePreview: true,
      }),
    ).toMatchObject({ isAccessible: true, reason: "free-preview" });
  });

  it("keeps locked paid lessons closed for unenrolled students", () => {
    expect(
      getCourseAccessDecision({
        courseStatus: "not-enrolled",
        role: "student",
        isFreePreview: false,
      }),
    ).toMatchObject({ isAccessible: false, reason: "locked" });
  });

  it("allows enrolled students to access locked paid lessons", () => {
    expect(
      getCourseAccessDecision({
        courseStatus: "enrolled",
        role: "student",
        isFreePreview: false,
      }),
    ).toMatchObject({ isAccessible: true, reason: "enrolled" });
  });

  it("allows admins to preview or review lessons", () => {
    expect(
      getCourseAccessDecision({
        courseStatus: "not-enrolled",
        role: "admin",
        isFreePreview: false,
      }),
    ).toMatchObject({ isAccessible: true, reason: "admin-preview" });
  });

  it("allows instructor owners to preview their own lessons", () => {
    expect(
      getCourseAccessDecision({
        courseStatus: "not-enrolled",
        role: "instructor",
        isInstructorOwner: true,
        isFreePreview: false,
      }),
    ).toMatchObject({ isAccessible: true, reason: "instructor-owner-preview" });
  });

  it("does not grant authoring-style access to other instructors", () => {
    expect(
      getCourseAccessDecision({
        courseStatus: "not-enrolled",
        role: "instructor",
        isInstructorOwner: false,
        isFreePreview: false,
      }),
    ).toMatchObject({ isAccessible: false, reason: "locked" });
  });

  it("does not unlock lessons by position or subscription state", () => {
    expect(
      getCourseAccessDecision({
        courseStatus: "not-enrolled",
        role: "student",
        isFreePreview: false,
      }),
    ).toMatchObject({ isAccessible: false, reason: "locked" });
  });
});
