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

vi.mock("../../../auth/auth-storage", () => ({
  readStoredAuthSession: () => ({
    tokens: { accessToken: "test-token" },
  }),
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
      headers: { Authorization: "Bearer test-token" },
      body: {
        title: "Cell Biology",
        category: "Biology",
        description: "A practical course about cells.",
        difficulty: "BEGINNER",
        price: 49.99,
      },
    });
  });
});
