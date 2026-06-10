import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoursesProvider, useCoursesState } from "./CoursesStateContext";
import { logError } from "../../utils/logger";

vi.mock("../../services/courses.service", () => ({
  completeCourseLesson: vi.fn(),
  enrollCourse: vi.fn(),
  getEnrolledCoursesProgress: vi.fn(),
  getSavedCourseIds: vi.fn(),
  saveCourse: vi.fn(),
  trackCourseAccess: vi.fn(),
  unsaveCourse: vi.fn(),
}));

vi.mock("../../utils/logger", () => ({
  logError: vi.fn(),
}));

import { saveCourse, unsaveCourse } from "../../services/courses.service";

const mockSaveCourse = vi.mocked(saveCourse);
const mockUnsaveCourse = vi.mocked(unsaveCourse);
const mockLogError = vi.mocked(logError);

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

describe("CoursesProvider saved courses", () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestState: ReturnType<typeof useCoursesState> | null;

  function Probe() {
    latestState = useCoursesState();
    return null;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    latestState = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("updates saved state after a successful save", async () => {
    mockSaveCourse.mockResolvedValueOnce(undefined);

    await act(async () => {
      root.render(
        <CoursesProvider>
          <Probe />
        </CoursesProvider>,
      );
    });

    act(() => {
      latestState?.toggleBookmark("course-1");
    });
    expect(latestState?.state.bookmarks).toEqual([]);

    await act(async () => {
      await flushPromises();
    });

    expect(latestState?.state.bookmarks).toEqual(["course-1"]);
  });

  it("does not update saved state after a failed save and logs the failure", async () => {
    const error = new Error("save failed");
    mockSaveCourse.mockRejectedValueOnce(error);

    await act(async () => {
      root.render(
        <CoursesProvider>
          <Probe />
        </CoursesProvider>,
      );
    });

    act(() => {
      latestState?.toggleBookmark("course-1");
    });

    await act(async () => {
      await flushPromises();
    });

    expect(latestState?.state.bookmarks).toEqual([]);
    expect(mockLogError).toHaveBeenCalledWith("Saved course update failed", {
      operation: "courses.saveCourse",
      courseId: "course-1",
      error,
    });
  });

  it("updates saved state after a successful unsave", async () => {
    mockUnsaveCourse.mockResolvedValueOnce(undefined);

    await act(async () => {
      root.render(
        <CoursesProvider>
          <Probe />
        </CoursesProvider>,
      );
    });

    act(() => {
      latestState?.hydrate({ bookmarks: ["course-1"] });
    });
    expect(latestState?.state.bookmarks).toEqual(["course-1"]);

    act(() => {
      latestState?.toggleBookmark("course-1");
    });
    expect(latestState?.state.bookmarks).toEqual(["course-1"]);

    await act(async () => {
      await flushPromises();
    });

    expect(latestState?.state.bookmarks).toEqual([]);
  });

  it("does not update saved state after a failed unsave and logs the failure", async () => {
    const error = new Error("unsave failed");
    mockUnsaveCourse.mockRejectedValueOnce(error);

    await act(async () => {
      root.render(
        <CoursesProvider>
          <Probe />
        </CoursesProvider>,
      );
    });

    act(() => {
      latestState?.hydrate({ bookmarks: ["course-1"] });
    });

    act(() => {
      latestState?.toggleBookmark("course-1");
    });

    await act(async () => {
      await flushPromises();
    });

    expect(latestState?.state.bookmarks).toEqual(["course-1"]);
    expect(mockLogError).toHaveBeenCalledWith("Saved course update failed", {
      operation: "courses.unsaveCourse",
      courseId: "course-1",
      error,
    });
  });
});
