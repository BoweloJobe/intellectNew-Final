import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "../../../api";
import { ApiDashboardAdapter } from "./dashboard.adapter";

vi.mock("../../../api", () => ({
  httpClient: {
    get: vi.fn(),
  },
  toApiError: (error: unknown) => error,
}));

const mockHttpClient = vi.mocked(httpClient);

const studentDashboard = {
  stats: [
    { label: "Courses Enrolled", value: "1", key: "courses-enrolled" as const },
    { label: "Completed", value: "0", key: "completed" as const },
    { label: "Study Hours", value: "2", key: "study-hours" as const },
    { label: "Current Streak", value: "1", key: "current-streak" as const },
  ],
  continueLearning: [
    {
      courseId: "course-1",
      resumeLessonId: "lesson-2",
      title: "Cell Biology",
      progress: 50,
      lesson: "Membranes",
      duration: "4h total",
    },
  ],
  upcomingQuizzes: [],
  recommendations: [],
};

describe("ApiDashboardAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads student dashboard data from /dashboard/student", async () => {
    mockHttpClient.get.mockResolvedValueOnce({ status: "ok", data: studentDashboard });

    await expect(new ApiDashboardAdapter().getStudentDashboardData()).resolves.toEqual(studentDashboard);
    expect(mockHttpClient.get).toHaveBeenCalledWith("/dashboard/student");
  });

  it("propagates student dashboard API errors", async () => {
    const error = new Error("Dashboard unavailable");
    mockHttpClient.get.mockRejectedValueOnce(error);

    await expect(new ApiDashboardAdapter().getStudentDashboardData()).rejects.toBe(error);
  });
});
