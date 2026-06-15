import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api";
import { getLessonQuizActionState, getLessonQuizRoute, isLessonAccessDeniedError } from "./VideoLessonPage";

const videoLessonPageSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "VideoLessonPage.tsx"),
  "utf8",
);

describe("VideoLessonPage lesson quiz behavior", () => {
  it("targets the correct lesson quiz with lesson and course context", () => {
    expect(getLessonQuizRoute({ id: "lesson-1", quizId: "quiz-1" }, "course-1")).toBe(
      "/quizzes?quizId=quiz-1&lessonId=lesson-1&courseId=course-1",
    );
  });

  it("does not create a quiz route when a lesson has no quiz id", () => {
    expect(getLessonQuizRoute({ id: "lesson-1" }, "course-1")).toBeNull();
  });

  it("hides quiz actions when a lesson has no quiz", () => {
    expect(getLessonQuizActionState({ id: "lesson-1", quizAvailable: false, quizId: undefined }, "course-1")).toBe("hidden");
  });

  it("shows attempt when a lesson quiz id exists", () => {
    expect(
      getLessonQuizActionState({ quizAvailable: true, quizId: "quiz-1", id: "lesson-1" }, "course-1"),
    ).toBe("attempt");
  });

  it("does not render the old lesson metadata card component", () => {
    expect(videoLessonPageSource).not.toContain("<LessonHeader");
    expect(videoLessonPageSource).not.toContain("from \"../components/lesson/LessonHeader\"");
    expect(videoLessonPageSource).not.toContain("LESSON_METADATA_CARD_TEST_ID");
    expect(videoLessonPageSource).not.toContain("No quiz for this lesson yet");
    expect(videoLessonPageSource).not.toContain("{lesson.courseName} / {lesson.moduleName}");
  });

  it("handles backend access denied responses as locked lesson access", () => {
    expect(
      isLessonAccessDeniedError(new ApiError({
        category: "http",
        message: "Lesson is locked",
        status: 403,
      })),
    ).toBe(true);

    expect(
      isLessonAccessDeniedError(new ApiError({
        category: "http",
        message: "Lesson not found",
        status: 404,
      })),
    ).toBe(false);
  });
});
