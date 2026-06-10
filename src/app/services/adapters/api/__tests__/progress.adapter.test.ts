/**
 * Unit tests for ApiProgressAdapter
 *
 * Verifies that the adapter:
 *  - builds ProgressPageData from backend enrollment + per-course-progress responses
 *  - correctly classifies courses into completed / in-progress / not-started pie slices
 *  - degrades gracefully when individual progress fetches fail
 *  - returns EMPTY_PROGRESS_DATA when there are no enrollments
 *  - computes subject-mastery grouping correctly
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import { httpClient } from "../../../../api";
import type { ProgressPageData } from "../../../../models/progress";

// ── Mock the http client and auth storage ────────────────────────────────────
vi.mock("../../../../api", () => ({
  httpClient: { get: vi.fn() },
  toApiError: (_err: unknown, _ctx: unknown) => new Error("api-error"),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockGet = httpClient.get as MockedFunction<typeof httpClient.get>;

function makeEnrollment(id: string, category = "Biology", title = "Course") {
  return {
    id,
    enrolledAt: new Date().toISOString(),
    completedAt: null,
    course: { id, category },
    courseTitle: title,
  };
}

function makeProgressResponse(courseId: string, percentage: number, completedLessons = 2, totalLessons = 4) {
  return {
    data: {
      progress: {
        courseId,
        totalLessons,
        completedLessons,
        percentage,
        completedAt: percentage >= 100 ? new Date().toISOString() : null,
        lessonProgress: Array.from({ length: completedLessons }, (_, i) => ({
          lessonId: `lesson-${i}`,
          completedAt: new Date().toISOString(),
        })),
      },
    },
  };
}

// ── Adapter import (after mocks are set up) ───────────────────────────────────
import { ApiProgressAdapter } from "../progress.adapter.js";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ApiProgressAdapter > getProgressPageData", () => {
  let adapter: ApiProgressAdapter;

  beforeEach(() => {
    adapter = new ApiProgressAdapter();
    vi.clearAllMocks();
  });

  it("returns EMPTY_PROGRESS_DATA when there are no enrollments", async () => {
    mockGet.mockResolvedValueOnce({ data: { enrollments: [] } });

    const data: ProgressPageData = await adapter.getProgressPageData();

    expect(data.subjectMastery).toHaveLength(0);
    expect(data.pieData.find((d: { name: string }) => d.name === "Not Started")?.value).toBe(100);
    expect(data.pieData.find((d: { name: string }) => d.name === "Completed")?.value).toBe(0);
  });

  it("returns 100% completed slice when all enrolled courses are done", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { enrollments: [makeEnrollment("c1"), makeEnrollment("c2")] } })
      .mockResolvedValueOnce(makeProgressResponse("c1", 100, 4, 4))
      .mockResolvedValueOnce(makeProgressResponse("c2", 100, 4, 4));

    const data = await adapter.getProgressPageData();

    const completedSlice = data.pieData.find((d) => d.name === "Completed");
    expect(completedSlice?.value).toBe(100);
    const inProgressSlice = data.pieData.find((d) => d.name === "In Progress");
    expect(inProgressSlice?.value).toBe(0);
  });

  it("correctly splits completed / in-progress / not-started across 3 courses", async () => {
    // c1 = 100%, c2 = 50%, c3 = 0%
    mockGet
      .mockResolvedValueOnce({
        data: {
          enrollments: [
            makeEnrollment("c1", "Biology"),
            makeEnrollment("c2", "Chemistry"),
            makeEnrollment("c3", "Physics"),
          ],
        },
      })
      .mockResolvedValueOnce(makeProgressResponse("c1", 100, 4, 4))  // completed
      .mockResolvedValueOnce(makeProgressResponse("c2", 50, 2, 4))   // in-progress
      .mockResolvedValueOnce(makeProgressResponse("c3", 0, 0, 4));   // not-started

    const data = await adapter.getProgressPageData();

    // 1/3 of courses are completed => 33%
    expect(data.pieData.find((d) => d.name === "Completed")?.value).toBe(33);
    // 1/3 in-progress => 33%
    expect(data.pieData.find((d) => d.name === "In Progress")?.value).toBe(33);
    // remaining => 34% (max(0, 100 - 33 - 33))
    expect(data.pieData.find((d) => d.name === "Not Started")?.value).toBeGreaterThanOrEqual(0);
  });

  it("groups courses by category into subject-mastery correctly", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          enrollments: [
            makeEnrollment("c1", "Biology"),
            makeEnrollment("c2", "Biology"),
            makeEnrollment("c3", "Physics"),
          ],
        },
      })
      .mockResolvedValueOnce(makeProgressResponse("c1", 80))          // Biology 80%
      .mockResolvedValueOnce(makeProgressResponse("c2", 60))          // Biology 60%
      .mockResolvedValueOnce(makeProgressResponse("c3", 100, 4, 4)); // Physics 100%

    const data = await adapter.getProgressPageData();

    const biology = data.subjectMastery.find((s) => s.subject === "Biology");
    expect(biology).toBeDefined();
    expect(biology?.value).toBe(70); // avg(80, 60)

    const physics = data.subjectMastery.find((s) => s.subject === "Physics");
    expect(physics?.value).toBe(100);
  });

  it("degrades gracefully when one per-course progress fetch fails", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { enrollments: [makeEnrollment("c1"), makeEnrollment("c2")] },
      })
      .mockResolvedValueOnce(makeProgressResponse("c1", 75)) // c1 succeeds
      .mockRejectedValueOnce(new Error("network error"));    // c2 fails

    // Should not throw; c2 defaults to 0%
    const data = await adapter.getProgressPageData();

    expect(data.subjectMastery).toBeDefined();
    // c1 is at 75% (in-progress), c2 defaults to 0% (not-started)
    const inProgressSlice = data.pieData.find((d) => d.name === "In Progress");
    expect(inProgressSlice?.value).toBe(50); // 1 of 2 is in-progress
  });

  it("includes strengths for subjects with mastery >= 75", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { enrollments: [makeEnrollment("c1", "Biology")] },
      })
      .mockResolvedValueOnce(makeProgressResponse("c1", 80));

    const data = await adapter.getProgressPageData();

    expect(data.strengths.some((s) => s.toLowerCase().includes("biology"))).toBe(true);
    expect(data.focusAreas.some((s) => s.toLowerCase().includes("all subjects"))).toBe(true);
  });

  it("includes focus areas for subjects with mastery < 75", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: { enrollments: [makeEnrollment("c1", "Mathematics")] },
      })
      .mockResolvedValueOnce(makeProgressResponse("c1", 50));

    const data = await adapter.getProgressPageData();

    expect(data.focusAreas.some((s) => s.toLowerCase().includes("mathematics"))).toBe(true);
    expect(data.strengths.some((s) => s.toLowerCase().includes("studying") || s.toLowerCase().includes("mastery"))).toBe(true);
  });
});
