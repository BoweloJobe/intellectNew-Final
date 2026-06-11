import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "../../../api";
import { ApiCoursesAdapter } from "./courses.adapter";
import type { InstructorCourseDraftInput } from "../../../models/courses";

vi.mock("../../../api", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  toApiError: (error: unknown) => error,
}));

const mockHttpClient = vi.mocked(httpClient);

const backendCourse = {
  id: "course-1",
  title: "Cell Biology",
  description: "A practical course about cells.",
  category: "Biology",
  difficulty: "BEGINNER",
  thumbnailUrl: null,
  estimatedHours: null,
  price: 49.99,
  status: "DRAFT",
  publishedAt: null,
  createdAt: "2026-06-08T10:00:00.000Z",
  instructor: {
    id: "instructor-1",
    firstName: "Ada",
    lastName: "Lovelace",
    avatarUrl: null,
  },
  modules: [],
  rejectionReason: null,
};

describe("ApiCoursesAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates courses with supported payload fields only", async () => {
    mockHttpClient.post.mockResolvedValueOnce({
      status: "ok",
      data: { course: backendCourse },
    });
    mockHttpClient.get.mockResolvedValueOnce({
      status: "ok",
      data: { course: backendCourse },
    });

    const input = {
      title: "Cell Biology",
      instructor: "Ada Lovelace",
      category: "Biology",
      description: "A practical course about cells.",
      difficulty: "beginner",
      totalLessons: 0,
      initialStatus: "draft",
      price: 49.99,
      learningOutcomes: ["Describe cell structures"],
      duration: "8 weeks",
    } satisfies InstructorCourseDraftInput & {
      learningOutcomes: string[];
      duration: string;
    };

    await new ApiCoursesAdapter().createInstructorCourse(input);

    expect(mockHttpClient.post).toHaveBeenCalledWith("/courses", {
      body: {
        title: "Cell Biology",
        category: "Biology",
        description: "A practical course about cells.",
        difficulty: "BEGINNER",
        price: 49.99,
      },
    });
  });

  it("creates lesson quizzes with instructor-set time limits", async () => {
    mockHttpClient.post
      .mockResolvedValueOnce({ status: "ok", data: { course: { ...backendCourse, id: "course-1" } } })
      .mockResolvedValueOnce({ status: "ok", data: { module: { id: "module-1" } } })
      .mockResolvedValueOnce({ status: "ok", data: { lesson: { id: "lesson-1" } } })
      .mockResolvedValueOnce({ status: "ok", data: { quiz: { id: "quiz-1" } } })
      .mockResolvedValue({ status: "ok", data: { question: { id: "question-1" } } });
    mockHttpClient.get.mockResolvedValueOnce({
      status: "ok",
      data: { course: backendCourse },
    });

    await new ApiCoursesAdapter().createInstructorCourse({
      title: "Cell Biology",
      instructor: "Ada Lovelace",
      category: "Biology",
      description: "A practical course about cells.",
      difficulty: "beginner",
      totalLessons: 1,
      initialStatus: "draft",
      modules: [
        {
          title: "Basics",
          lessons: [
            {
              title: "Cells",
              videoUrl: "https://example.com/video",
              description: "Cell intro",
              duration: "10m",
              estimatedCompletionTimeMinutes: 10,
              notesContent: "Notes",
              isFreePreview: false,
              quizAvailable: true,
              quizTimeLimitMinutes: 12,
              quizQuestions: [
                {
                  prompt: "Question?",
                  optionA: "A",
                  optionB: "B",
                  optionC: "C",
                  optionD: "D",
                  correctOption: "a",
                  explanation: "Because.",
                },
              ],
            },
          ],
        },
      ],
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith("/content/lessons/lesson-1/quiz", {
      body: {
        title: "Quiz: Cells",
        passingScore: 70,
        timeLimitSeconds: 720,
      },
    });
  });

  it("surfaces lesson quiz creation failures instead of returning a successful course save", async () => {
    const quizFailure = new Error("Quiz creation failed");
    mockHttpClient.post
      .mockResolvedValueOnce({ status: "ok", data: { course: { ...backendCourse, id: "course-1" } } })
      .mockResolvedValueOnce({ status: "ok", data: { module: { id: "module-1" } } })
      .mockResolvedValueOnce({ status: "ok", data: { lesson: { id: "lesson-1" } } })
      .mockRejectedValueOnce(quizFailure);

    await expect(new ApiCoursesAdapter().createInstructorCourse({
      title: "Cell Biology",
      instructor: "Ada Lovelace",
      category: "Biology",
      description: "A practical course about cells.",
      difficulty: "beginner",
      totalLessons: 1,
      initialStatus: "draft",
      modules: [
        {
          title: "Basics",
          lessons: [
            {
              title: "Cells",
              videoUrl: "https://example.com/video",
              description: "Cell intro",
              duration: "10m",
              estimatedCompletionTimeMinutes: 10,
              notesContent: "Notes",
              isFreePreview: false,
              quizAvailable: true,
              quizTimeLimitMinutes: 12,
              quizQuestions: [
                {
                  prompt: "Question?",
                  optionA: "A",
                  optionB: "B",
                  optionC: "C",
                  optionD: "D",
                  correctOption: "a",
                  explanation: "Because.",
                },
              ],
            },
          ],
        },
      ],
    })).rejects.toBe(quizFailure);

    expect(mockHttpClient.get).not.toHaveBeenCalledWith("/courses/mine/course-1");
  });

  it("updates existing lesson quiz time limits when editing courses", async () => {
    const courseWithLesson = {
      ...backendCourse,
      modules: [
        {
          id: "module-1",
          title: "Basics",
          order: 0,
          lessons: [{ id: "lesson-1", title: "Cells", order: 0 }],
        },
      ],
    };
    mockHttpClient.get
      .mockResolvedValueOnce({ status: "ok", data: { course: courseWithLesson } })
      .mockResolvedValueOnce({ status: "ok", data: { course: courseWithLesson } });
    mockHttpClient.put.mockResolvedValue({ status: "ok", data: {} });

    await new ApiCoursesAdapter().editInstructorCourse({
      courseId: "course-1",
      title: "Cell Biology",
      instructor: "Ada Lovelace",
      category: "Biology",
      description: "A practical course about cells.",
      difficulty: "beginner",
      totalLessons: 1,
      initialStatus: "draft",
      modules: [
        {
          id: "module-1",
          title: "Basics",
          lessons: [
            {
              id: "lesson-1",
              title: "Cells",
              videoUrl: "https://example.com/video",
              description: "Cell intro",
              duration: "10m",
              estimatedCompletionTimeMinutes: 10,
              notesContent: "Notes",
              isFreePreview: false,
              quizAvailable: true,
              quizId: "quiz-1",
              quizTimeLimitMinutes: 5,
              quizQuestions: [],
            },
          ],
        },
      ],
    });

    expect(mockHttpClient.put).toHaveBeenCalledWith("/content/quizzes/quiz-1", {
      body: { timeLimitSeconds: 300 },
    });
  });

  it("surfaces blocked lesson deletions during course edits", async () => {
    const courseWithLesson = {
      ...backendCourse,
      modules: [
        {
          id: "module-1",
          title: "Basics",
          order: 0,
          lessons: [{ id: "lesson-1", title: "Cells", order: 0 }],
        },
      ],
    };
    mockHttpClient.get.mockResolvedValueOnce({ status: "ok", data: { course: courseWithLesson } });
    mockHttpClient.put.mockResolvedValue({ status: "ok", data: {} });
    mockHttpClient.delete.mockRejectedValueOnce(new Error("Lesson has progress"));

    await expect(new ApiCoursesAdapter().editInstructorCourse({
      courseId: "course-1",
      title: "Cell Biology",
      instructor: "Ada Lovelace",
      category: "Biology",
      description: "A practical course about cells.",
      difficulty: "beginner",
      totalLessons: 0,
      initialStatus: "draft",
      modules: [
        {
          id: "module-1",
          title: "Basics",
          lessons: [],
        },
      ],
    })).rejects.toThrow("lesson could not be deleted");

    expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
  });

  it("loads saved course ids from GET /courses/saved", async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      status: "ok",
      data: { courses: [backendCourse] },
    });

    await expect(new ApiCoursesAdapter().getSavedCourseIds()).resolves.toEqual(["course-1"]);
    expect(mockHttpClient.get).toHaveBeenCalledWith("/courses/saved");
  });

  it("saves and unsaves courses through backend endpoints", async () => {
    mockHttpClient.post.mockResolvedValueOnce(undefined);
    mockHttpClient.delete.mockResolvedValueOnce(undefined);

    await new ApiCoursesAdapter().saveCourse("course-1");
    await new ApiCoursesAdapter().unsaveCourse("course-1");

    expect(mockHttpClient.post).toHaveBeenCalledWith("/courses/course-1/save");
    expect(mockHttpClient.delete).toHaveBeenCalledWith("/courses/course-1/save");
  });
});
