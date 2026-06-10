import { beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { ApiError, httpClient } from "../../../../api";
import { LessonNotFoundError } from "../../../contracts/lessons.contract";

vi.mock("../../../../api", async () => {
  const actual = await vi.importActual<typeof import("../../../../api")>("../../../../api");
  return {
    ...actual,
    httpClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
  };
});

const mockGet = httpClient.get as MockedFunction<typeof httpClient.get>;
const mockPatch = httpClient.patch as MockedFunction<typeof httpClient.patch>;

function lessonItem(overrides = {}) {
  return {
    id: "lesson-1",
    courseId: "course-1",
    moduleId: "module-1",
    moduleTitle: "Module 1",
    title: "Lesson 1",
    description: "Lesson description",
    notes: "Lesson notes",
    videoUrl: "https://video.example/lesson-1",
    videoDurationSecs: 600,
    estimatedMinutes: 10,
    order: 1,
    isFree: false,
    quizId: "quiz-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    course: {
      id: "course-1",
      title: "Course 1",
      category: "Programming",
      difficulty: "BEGINNER",
      thumbnailUrl: null,
      instructor: { id: "instructor-1", firstName: "Ada", lastName: "Lovelace", avatarUrl: null },
    },
    ...overrides,
  };
}

import { ApiLessonsAdapter } from "../lessons.adapter";

describe("ApiLessonsAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads lesson page data from the direct lesson endpoint", async () => {
    mockGet.mockResolvedValueOnce({
      status: "ok",
      data: {
        lesson: lessonItem(),
        furtherLessons: [lessonItem({ id: "lesson-2", title: "Lesson 2", order: 2, quizId: null })],
        courseLessons: [
          lessonItem(),
          lessonItem({ id: "lesson-2", title: "Lesson 2", order: 2, quizId: null }),
        ],
      },
    });

    const data = await new ApiLessonsAdapter().getVideoLessonPageData("course-1", "lesson-1");

    expect(mockGet).toHaveBeenCalledWith("/content/lessons/lesson-1");
    expect(data.lesson.id).toBe("lesson-1");
    expect(data.lesson.videoUrl).toBe("https://video.example/lesson-1");
    expect(data.lesson.quizAvailable).toBe(true);
    expect(data.courseLessons).toHaveLength(2);
  });

  it("maps missing lesson responses to LessonNotFoundError", async () => {
    mockGet.mockRejectedValueOnce(new ApiError({
      category: "http",
      status: 404,
      message: "Lesson not found",
    }));

    await expect(
      new ApiLessonsAdapter().getVideoLessonPageData("course-1", "missing"),
    ).rejects.toBeInstanceOf(LessonNotFoundError);
  });

  it("propagates forbidden lesson responses without fake content", async () => {
    mockGet.mockRejectedValueOnce(new ApiError({
      category: "http",
      status: 403,
      message: "Lesson is locked",
    }));

    await expect(
      new ApiLessonsAdapter().getVideoLessonPageData("course-1", "lesson-1"),
    ).rejects.toMatchObject({ status: 403, message: "Lesson is locked" });
  });

  it("saves lesson watch progress to the content endpoint", async () => {
    mockPatch.mockResolvedValueOnce({ status: "ok", data: { watchProgress: {} } });

    await new ApiLessonsAdapter().saveLessonWatchProgress("lesson-1", {
      watchedSeconds: 120,
      lastPositionSeconds: 45,
      completed: true,
    });

    expect(mockPatch).toHaveBeenCalledWith("/content/lessons/lesson-1/watch-progress", {
      body: {
        watchedSeconds: 120,
        lastPositionSeconds: 45,
        completed: true,
      },
    });
  });

  it("sends legacy watched duration tracking through watch progress", async () => {
    mockPatch.mockResolvedValueOnce({ status: "ok", data: { watchProgress: {} } });

    await new ApiLessonsAdapter().trackLessonProgress("lesson-1", "course-1", 90);

    expect(mockPatch).toHaveBeenCalledWith("/content/lessons/lesson-1/watch-progress", {
      body: { watchedSeconds: 90 },
    });
  });

  it("propagates watch progress API errors", async () => {
    mockPatch.mockRejectedValueOnce(new ApiError({
      category: "http",
      status: 403,
      message: "Not enrolled in this course",
    }));

    await expect(
      new ApiLessonsAdapter().saveLessonWatchProgress("lesson-1", { watchedSeconds: 10 }),
    ).rejects.toMatchObject({ status: 403, message: "Not enrolled in this course" });
  });
});
