import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InitialDomainDataBootstrap } from "./InitialDomainDataBootstrap";

const mockUseAuth = vi.hoisted(() => vi.fn());
const mockReloadCommunityData = vi.hoisted(() => vi.fn());
const mockReloadEnrollments = vi.hoisted(() => vi.fn());
const mockReloadSavedCourses = vi.hoisted(() => vi.fn());
const mockReloadTutorData = vi.hoisted(() => vi.fn());

vi.mock("../../auth/AuthContext", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("../community/CommunityStateContext", () => ({
  useCommunityState: () => ({ reloadCommunityData: mockReloadCommunityData }),
}));

vi.mock("../courses/CoursesStateContext", () => ({
  useCoursesState: () => ({
    reloadEnrollments: mockReloadEnrollments,
    reloadSavedCourses: mockReloadSavedCourses,
  }),
}));

vi.mock("../tutor/TutorStateContext", () => ({
  useTutorState: () => ({ reloadTutorData: mockReloadTutorData }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("InitialDomainDataBootstrap saved courses", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
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

  it("does not reload saved courses for unauthenticated users", async () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated" });

    await act(async () => {
      root.render(<InitialDomainDataBootstrap />);
    });

    expect(mockReloadSavedCourses).not.toHaveBeenCalled();
  });

  it("reloads saved courses for authenticated users", async () => {
    mockUseAuth.mockReturnValue({ status: "authenticated" });

    await act(async () => {
      root.render(<InitialDomainDataBootstrap />);
    });

    expect(mockReloadSavedCourses).toHaveBeenCalledTimes(1);
  });
});
