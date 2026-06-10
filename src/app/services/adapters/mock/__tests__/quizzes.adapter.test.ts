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
});
