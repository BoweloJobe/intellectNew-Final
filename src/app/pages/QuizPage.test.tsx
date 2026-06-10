import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api";
import { QuizPage } from "./QuizPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockPushNotification = vi.fn();
const mockAddRecentActivity = vi.fn();
const mockApplyQuizCompletion = vi.fn();
const mockApplyQuizSubjectScore = vi.fn();
const mockGetQuizzesPageData = vi.fn();
const mockGetQuizTemplate = vi.fn();
const mockStartQuizAttempt = vi.fn();
const mockSubmitQuizAttempt = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: {} }),
  useSearchParams: () => [new URLSearchParams("quizId=quiz-1")],
}));

vi.mock("../hooks/useAsyncViewState", () => ({
  useAsyncViewState: () => ({
    errorMessage: null,
    isLoading: false,
    isError: false,
    run: async <T,>(task: () => Promise<T>) => task(),
  }),
}));

vi.mock("../services/quizzes.service", () => ({
  getQuizzesPageData: () => mockGetQuizzesPageData(),
  getQuizTemplate: (...args: unknown[]) => mockGetQuizTemplate(...args),
  startQuizAttempt: (...args: unknown[]) => mockStartQuizAttempt(...args),
  submitQuizAttempt: (...args: unknown[]) => mockSubmitQuizAttempt(...args),
}));

vi.mock("../state/notifications/NotificationsStateContext", () => ({
  createProductNotification: (input: unknown) => input,
  useNotificationsState: () => ({
    addRecentActivity: mockAddRecentActivity,
    pushNotification: mockPushNotification,
  }),
}));

vi.mock("../state/dashboard/DashboardStateContext", () => ({
  useDashboardState: () => ({
    applyQuizCompletion: mockApplyQuizCompletion,
    applyQuizSubjectScore: mockApplyQuizSubjectScore,
  }),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "learner@example.com",
      fullName: "Test Learner",
      firstName: "Test",
      lastName: "Learner",
      role: "STUDENT",
    },
  }),
}));

const quizTemplate = {
  id: "quiz-1",
  subject: "Biology",
  topic: "Cells",
  difficulty: "Medium" as const,
  estimatedDurationMinutes: 1,
  timeLimitSeconds: 1,
  questions: [
    {
      id: "question-1",
      prompt: "What is a cell?",
      questionType: "MCQ" as const,
      options: [
        { id: "option-1", text: "Answer A" },
        { id: "option-2", text: "Answer B" },
      ],
      correctOptionId: "option-1",
      explanation: "",
    },
  ],
};

describe("QuizPage timed attempt behavior", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));
    vi.clearAllMocks();

    mockGetQuizzesPageData.mockResolvedValue({
      upcomingQuizzes: [],
      pastQuizzes: [],
      practiceQuizzes: [],
    });
    mockGetQuizTemplate.mockResolvedValue(quizTemplate);
    mockStartQuizAttempt.mockResolvedValue({
      attemptId: "attempt-1",
      quizId: "quiz-1",
      status: "IN_PROGRESS",
      startedAt: "2026-06-10T12:00:00.000Z",
      expiresAt: "2026-06-10T12:00:01.000Z",
      serverTime: "2026-06-10T12:00:00.000Z",
      timeLimitSeconds: 1,
    });
    mockSubmitQuizAttempt.mockRejectedValue(new ApiError({
      category: "http",
      status: 409,
      message: "Quiz attempt expired",
    }));

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it("does not retry auto-submit after an expired response", async () => {
    await act(async () => {
      root.render(<QuizPage />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(1_500);
      await Promise.resolve();
    });

    expect(mockSubmitQuizAttempt).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5_000);
      await Promise.resolve();
    });

    expect(mockSubmitQuizAttempt).toHaveBeenCalledTimes(1);
  });

  it("starts a timed attempt and renders the visible countdown", async () => {
    await act(async () => {
      root.render(<QuizPage />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockStartQuizAttempt).toHaveBeenCalledWith("quiz-1");
    expect(container.textContent).toContain("0:01");
  });
});
