import { describe, expect, it } from "vitest";
import { MockQuizzesAdapter } from "../quizzes.adapter";

describe("MockQuizzesAdapter", () => {
  it("starts a compatible quiz attempt", async () => {
    const adapter = new MockQuizzesAdapter();
    const template = await adapter.getQuizTemplate({ quizId: "biology-basics" });
    const attempt = await adapter.startQuizAttempt(template.id);

    expect(attempt.quizId).toBe(template.id);
    expect(attempt.attemptId).toMatch(/^mock-attempt-/);
    expect(attempt.status).toBe("IN_PROGRESS");
    expect(attempt.startedAt).toBeTruthy();
    expect(attempt.serverTime).toBeTruthy();
  });

  it("returns expiry metadata for timed mock quizzes", async () => {
    const adapter = new MockQuizzesAdapter();
    const created = await adapter.createStandaloneQuiz({
      title: "Timed mock quiz",
      category: "Biology",
      difficulty: "Medium",
      timeLimitSeconds: 300,
      questions: [
        {
          questionType: "MCQ",
          text: "Question?",
          options: [
            { text: "A", isCorrect: true },
            { text: "B", isCorrect: false },
          ],
        },
      ],
    });

    const attempt = await adapter.startQuizAttempt(created.quizId);

    expect(attempt.timeLimitSeconds).toBe(300);
    expect(attempt.expiresAt).toBeTruthy();
  });
});
