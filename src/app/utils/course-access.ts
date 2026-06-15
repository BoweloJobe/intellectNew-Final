import type { AuthRole } from "../../services/auth";
import type { CourseStatus } from "../models/courses";

export type CourseAccessDecision = {
  isAccessible: boolean;
  isLocked: boolean;
  isPremiumContent: boolean;
  reason: "admin-preview" | "instructor-owner-preview" | "enrolled" | "free-preview" | "locked";
  label: "Preview" | "Enrolled" | "Review" | "Locked";
};

export function getCourseAccessDecision(input: {
  courseStatus?: CourseStatus;
  role?: AuthRole | null;
  isFreePreview?: boolean;
  isInstructorOwner?: boolean;
}): CourseAccessDecision {
  if (input.role === "admin") {
    return {
      isAccessible: true,
      isLocked: false,
      isPremiumContent: !input.isFreePreview,
      reason: "admin-preview",
      label: "Review",
    };
  }

  if (input.role === "instructor" && input.isInstructorOwner === true) {
    return {
      isAccessible: true,
      isLocked: false,
      isPremiumContent: !input.isFreePreview,
      reason: "instructor-owner-preview",
      label: "Preview",
    };
  }

  if (input.courseStatus && input.courseStatus !== "not-enrolled") {
    return {
      isAccessible: true,
      isLocked: false,
      isPremiumContent: !input.isFreePreview,
      reason: "enrolled",
      label: "Enrolled",
    };
  }

  if (input.isFreePreview === true) {
    return {
      isAccessible: true,
      isLocked: false,
      isPremiumContent: false,
      reason: "free-preview",
      label: "Preview",
    };
  }

  return {
    isAccessible: false,
    isLocked: true,
    isPremiumContent: true,
    reason: "locked",
    label: "Locked",
  };
}
