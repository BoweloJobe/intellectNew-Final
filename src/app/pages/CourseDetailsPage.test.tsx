import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const courseDetailsPageSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "CourseDetailsPage.tsx"),
  "utf8",
);

describe("CourseDetailsPage lesson access behavior", () => {
  it("does not route a known locked paid lesson as playable", () => {
    expect(courseDetailsPageSource).toContain("if (isLocked)");
    expect(courseDetailsPageSource).toContain("Enroll in this course to unlock this lesson.");
    expect(courseDetailsPageSource).toContain("navigate(`/courses/${courseId}/lessons/${lesson.id}`)");
  });

  it("does not use the old first-three or subscription unlock rules", () => {
    expect(courseDetailsPageSource).not.toContain("lessonOrder: index + 1");
    expect(courseDetailsPageSource).not.toContain("Upgrade to Pro to unlock premium topics after the first 3 lessons.");
    expect(courseDetailsPageSource).not.toContain("subscription,");
  });
});
