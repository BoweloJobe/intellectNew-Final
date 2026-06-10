import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../api";
import { httpClient } from "../../../../api/client/httpClient";
import { ApiQuizzesAdapter } from "../quizzes.adapter";

vi.mock("../../../../api/client/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../../../../auth/auth-storage", () => ({
  readStoredAuthSession: vi.fn(() => ({
    tokens: { accessToken: "test-token" },
    user: { role: "STUDENT" },
  })),
}));

const mockHttpClient = vi.mocked(httpClient);

describe("ApiQuizzesAdapter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("starts a quiz attempt and parses timing metadata", async () => {
    mockHttpClient.post.mockResolvedValue({
      status: "ok",
      data: {
        attempt: {
          attemptId: "attempt-1",
          quizId: "quiz-1",
          status: "IN_PROGRESS",
          startedAt: "2026-06-10T12:00:00.000Z",
          expiresAt: "2026-06-10T12:10:00.000Z",
          serverTime: "2026-06-10T12:00:00.000Z",
          timeLimitSeconds: 600,
        },
      },
    });

    const result = await new ApiQuizzesAdapter().startQuizAttempt("quiz-1");

    expect(mockHttpClient.post).toHaveBeenCalledWith("/content/quizzes/quiz-1/attempts/start");
    expect(result).toEqual({
      attemptId: "attempt-1",
      quizId: "quiz-1",
      status: "IN_PROGRESS",
      startedAt: "2026-06-10T12:00:00.000Z",
      expiresAt: "2026-06-10T12:10:00.000Z",
      serverTime: "2026-06-10T12:00:00.000Z",
      timeLimitSeconds: 600,
    });
  });

  it("submits quiz answers with the attempt id", async () => {
    mockHttpClient.post.mockResolvedValue({
      status: "ok",
      data: {
        result: {
          id: "attempt-1",
          score: 100,
          passed: true,
          submittedAt: "2026-06-10T12:05:00.000Z",
          answers: [
            {
              questionId: "question-1",
              questionType: "MCQ",
              selectedOptionId: "option-1",
              textAnswer: null,
              isCorrect: true,
              marksAwarded: 1,
              maxMarks: 1,
              matchedKeywords: [],
              correctOptionId: "option-1",
              explanation: "Because it is correct.",
            },
          ],
          totalQuestions: 1,
          marksEarned: 1,
          marksTotal: 1,
          passingScore: 70,
        },
      },
    });

    const result = await new ApiQuizzesAdapter().submitQuizAttempt({
      quizId: "quiz-1",
      attemptId: "attempt-1",
      answersByQuestionId: { "question-1": "option-1" },
      elapsedSeconds: 30,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith("/content/quizzes/quiz-1/attempt", {
      body: {
        attemptId: "attempt-1",
        answers: [{ questionId: "question-1", selectedOptionId: "option-1" }],
      },
    });
    expect(result).toMatchObject({
      quizId: "quiz-1",
      score: 1,
      maxScore: 1,
      percentage: 100,
    });
  });

  it("propagates expired attempt submit failures", async () => {
    mockHttpClient.post.mockRejectedValue(new ApiError({
      category: "http",
      status: 409,
      message: "Quiz attempt expired",
    }));

    await expect(
      new ApiQuizzesAdapter().submitQuizAttempt({
        quizId: "quiz-1",
        attemptId: "attempt-1",
        answersByQuestionId: { "question-1": "option-1" },
        elapsedSeconds: 61,
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: "Quiz attempt expired",
    });
  });
});
