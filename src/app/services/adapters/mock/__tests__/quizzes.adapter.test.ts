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

  it("scores MCQ answers by selected correct option id", async () => {
    const adapter = new MockQuizzesAdapter();
    const created = await adapter.createStandaloneQuiz({
      title: "MCQ scoring",
      category: "Biology",
      difficulty: "Medium",
      questions: [
        {
          questionType: "MCQ",
          text: "Which option is correct?",
          options: [
            { text: "Wrong", isCorrect: false },
            { text: "Right", isCorrect: true },
          ],
        },
      ],
    });
    const template = await adapter.getQuizTemplate({ quizId: created.quizId });
    const correctOptionId = template.questions[0].options[1].id;

    await expect(adapter.submitQuizAttempt({
      quizId: created.quizId,
      answersByQuestionId: {
        [template.questions[0].id]: { questionType: "MCQ", selectedOptionId: correctOptionId },
      },
      elapsedSeconds: 10,
    })).resolves.toMatchObject({ score: 1, maxScore: 1, percentage: 100 });
  });

  it("scores wrong MCQ answers as incorrect", async () => {
    const adapter = new MockQuizzesAdapter();
    const created = await adapter.createStandaloneQuiz({
      title: "MCQ wrong scoring",
      category: "Biology",
      difficulty: "Medium",
      questions: [
        {
          questionType: "MCQ",
          text: "Which option is correct?",
          options: [
            { text: "Wrong", isCorrect: false },
            { text: "Right", isCorrect: true },
          ],
        },
      ],
    });
    const template = await adapter.getQuizTemplate({ quizId: created.quizId });
    const wrongOptionId = template.questions[0].options[0].id;

    await expect(adapter.submitQuizAttempt({
      quizId: created.quizId,
      answersByQuestionId: {
        [template.questions[0].id]: { questionType: "MCQ", selectedOptionId: wrongOptionId },
      },
      elapsedSeconds: 10,
    })).resolves.toMatchObject({ score: 0, maxScore: 1, percentage: 0 });
  });

  it("scores short-answer keywords with case and punctuation normalization", async () => {
    const adapter = new MockQuizzesAdapter();
    const created = await adapter.createStandaloneQuiz({
      title: "Short answer scoring",
      category: "Biology",
      difficulty: "Medium",
      questions: [
        {
          questionType: "SHORT_ANSWER",
          text: "Name the process and pigment.",
          answerKey: "photosynthesis, chlorophyll",
          options: [],
        },
      ],
    });
    const template = await adapter.getQuizTemplate({ quizId: created.quizId });

    await expect(adapter.submitQuizAttempt({
      quizId: created.quizId,
      answersByQuestionId: {
        [template.questions[0].id]: {
          questionType: "SHORT_ANSWER",
          textAnswer: "PHOTOSYNTHESIS uses chlorophyll.",
        },
      },
      elapsedSeconds: 10,
    })).resolves.toMatchObject({ score: 2, maxScore: 2, percentage: 100 });
  });

  it("scores unrelated short answers as incorrect", async () => {
    const adapter = new MockQuizzesAdapter();
    const created = await adapter.createStandaloneQuiz({
      title: "Short answer wrong scoring",
      category: "Biology",
      difficulty: "Medium",
      questions: [
        {
          questionType: "SHORT_ANSWER",
          text: "Name the process and pigment.",
          answerKey: "photosynthesis, chlorophyll",
          options: [],
        },
      ],
    });
    const template = await adapter.getQuizTemplate({ quizId: created.quizId });

    await expect(adapter.submitQuizAttempt({
      quizId: created.quizId,
      answersByQuestionId: {
        [template.questions[0].id]: {
          questionType: "SHORT_ANSWER",
          textAnswer: "Respiration uses mitochondria.",
        },
      },
      elapsedSeconds: 10,
    })).resolves.toMatchObject({ score: 0, maxScore: 2, percentage: 0 });
  });

  it("surfaces instructor-created standalone quizzes as standalone practice cards", async () => {
    const adapter = new MockQuizzesAdapter();
    const created = await adapter.createStandaloneQuiz({
      title: "Standalone Cell Review",
      category: "Biology",
      difficulty: "Easy",
      questions: [
        {
          questionType: "MCQ",
          text: "Which structure contains DNA?",
          options: [
            { text: "Nucleus", isCorrect: true },
            { text: "Ribosome", isCorrect: false },
          ],
        },
      ],
    });

    const data = await adapter.getQuizzesPageData();
    const card = data.practiceQuizzes.find((quiz) => quiz.quizId === created.quizId);

    expect(card).toMatchObject({
      topic: "Standalone Cell Review",
      subject: "Biology",
      isStandalone: true,
    });
    expect(card?.lessonId).toBeUndefined();
  });
});
