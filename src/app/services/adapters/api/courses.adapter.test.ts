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
    vi.unstubAllGlobals();
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

  it("creates lesson-bound short-answer questions without MCQ options", async () => {
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
              quizQuestions: [
                {
                  questionType: "SHORT_ANSWER",
                  prompt: "Explain chlorophyll.",
                  optionA: "",
                  optionB: "",
                  optionC: "",
                  optionD: "",
                  correctOption: "a",
                  explanation: "Chlorophyll absorbs light.",
                  answerKey: "chlorophyll, light",
                },
              ],
            },
          ],
        },
      ],
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith("/content/quizzes/quiz-1/questions", {
      body: {
        text: "Explain chlorophyll.",
        explanation: "Chlorophyll absorbs light.",
        order: 0,
        questionType: "SHORT_ANSWER",
        answerKey: "chlorophyll, light",
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

  it("uploads and attaches lesson videos through signed provider details", async () => {
    const file = new File(["video-bytes"], "intro.mp4", { type: "video/mp4" });
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    mockHttpClient.post.mockResolvedValueOnce({
      status: "ok",
      data: {
        storageKey: "courses/course-1/modules/module-1/lessons/lesson-1/video.mp4",
        uploadUrl: "https://storage.example/upload",
        uploadMethod: "PUT",
        uploadHeaders: { "content-type": "video/mp4" },
        provider: "SUPABASE",
        expiresAt: "2026-06-12T10:00:00.000Z",
      },
    });
    mockHttpClient.put.mockResolvedValueOnce({
      status: "ok",
      data: {
        lesson: {
          id: "lesson-1",
          title: "Cells",
          description: "Cell intro",
          notes: "Notes",
          videoUrl: "https://storage.example/public/video.mp4",
          videoProvider: "SUPABASE",
          videoUploadStatus: "READY",
          videoDurationSecs: null,
          estimatedMinutes: 10,
          order: 0,
          isFree: false,
        },
      },
    });

    const result = await new ApiCoursesAdapter().uploadLessonVideo({
      courseId: "course-1",
      moduleId: "module-1",
      lessonId: "lesson-1",
      file,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith(
      "/courses/course-1/modules/module-1/lessons/lesson-1/video-upload",
      {
        body: {
          filename: "intro.mp4",
          mimeType: "video/mp4",
          fileSizeBytes: file.size,
        },
      },
    );
    expect(fetchMock).toHaveBeenCalledWith("https://storage.example/upload", {
      method: "PUT",
      headers: { "content-type": "video/mp4" },
      body: file,
    });
    expect(mockHttpClient.put).toHaveBeenCalledWith(
      "/courses/course-1/modules/module-1/lessons/lesson-1/video",
      { body: { videoStorageKey: "courses/course-1/modules/module-1/lessons/lesson-1/video.mp4" } },
    );
    expect(result).toEqual({
      videoUrl: "https://storage.example/public/video.mp4",
      videoProvider: "SUPABASE",
      videoUploadStatus: "READY",
    });
  });

  it("loads saved course ids from GET /courses/saved", async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      status: "ok",
      data: { courses: [backendCourse] },
    });

    await expect(new ApiCoursesAdapter().getSavedCourseIds()).resolves.toEqual(["course-1"]);
    expect(mockHttpClient.get).toHaveBeenCalledWith("/courses/saved");
  });

  it("maps catalog lesson counts from backend module counts", async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      status: "ok",
      data: {
        courses: [
          {
            ...backendCourse,
            modules: [
              { id: "module-1", title: "Basics", order: 0, _count: { lessons: 2 } },
              { id: "module-2", title: "Practice", order: 1, _count: { lessons: 3 } },
            ],
          },
        ],
      },
    });

    const data = await new ApiCoursesAdapter().getCoursesPageData();

    expect(data.courses[0].totalLessons).toBe(5);
  });

  it("maps enrolled course progress with next lesson and module summary", async () => {
    mockHttpClient.get
      .mockResolvedValueOnce({
        status: "ok",
        data: {
          enrollments: [
            {
              id: "enrollment-1",
              enrolledAt: "2026-06-10T12:00:00.000Z",
              completedAt: null,
              course: backendCourse,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        status: "ok",
        data: {
          progress: {
            courseId: "course-1",
            totalLessons: 5,
            completedLessons: 2,
            percentage: 40,
            completedAt: null,
            nextLessonId: "lesson-3",
            currentModule: {
              id: "module-2",
              title: "Practice",
              totalLessons: 3,
              completedLessons: 0,
            },
            modules: [
              {
                id: "module-1",
                title: "Basics",
                totalLessons: 2,
                completedLessons: 2,
              },
              {
                id: "module-2",
                title: "Practice",
                totalLessons: 3,
                completedLessons: 0,
              },
            ],
            lessonProgress: [
              { lessonId: "lesson-1", completedAt: "2026-06-10T12:00:00.000Z" },
              { lessonId: "lesson-2", completedAt: "2026-06-10T12:05:00.000Z" },
            ],
          },
        },
      });

    const progress = await new ApiCoursesAdapter().getEnrolledCoursesProgress();

    expect(progress).toEqual([
      {
        courseId: "course-1",
        courseTitle: "Cell Biology",
        progress: 40,
        resumeLessonId: "lesson-3",
        completedLessonIds: ["lesson-1", "lesson-2"],
        lastAccessedAt: "2026-06-10T12:05:00.000Z",
        totalLessons: 5,
        completedLessons: 2,
        currentModule: {
          id: "module-2",
          title: "Practice",
          totalLessons: 3,
          completedLessons: 0,
        },
        modules: [
          {
            id: "module-1",
            title: "Basics",
            totalLessons: 2,
            completedLessons: 2,
          },
          {
            id: "module-2",
            title: "Practice",
            totalLessons: 3,
            completedLessons: 0,
          },
        ],
      },
    ]);
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
