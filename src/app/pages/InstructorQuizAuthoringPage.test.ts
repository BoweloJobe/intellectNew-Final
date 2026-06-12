import { describe, expect, it } from "vitest";
import { getStandaloneQuizValidationError } from "./InstructorQuizAuthoringPage";

describe("getStandaloneQuizValidationError", () => {
  it("accepts a valid structured short-answer question on the first submit attempt", () => {
    expect(getStandaloneQuizValidationError({
      title: "Cell Biology",
      category: "Biology",
      questions: [
        {
          questionType: "SHORT_ANSWER",
          text: "Explain photosynthesis.",
          answerKey: "photosynthesis, chlorophyll",
          explanation: "Photosynthesis uses chlorophyll.",
          options: [],
        },
      ],
    })).toBeNull();
  });

  it("shows a clear validation error for structured questions without keywords", () => {
    expect(getStandaloneQuizValidationError({
      title: "Cell Biology",
      category: "Biology",
      questions: [
        {
          questionType: "SHORT_ANSWER",
          text: "Explain photosynthesis.",
          answerKey: "",
          options: [],
        },
      ],
    })).toEqual({
      message: "Question 1: add grading keywords for the short-answer question.",
      questionIndex: 0,
    });
  });

  it("requires exactly one correct MCQ option", () => {
    expect(getStandaloneQuizValidationError({
      title: "Cell Biology",
      category: "Biology",
      questions: [
        {
          questionType: "MCQ",
          text: "Which option is correct?",
          options: [
            { text: "A", isCorrect: true },
            { text: "B", isCorrect: true },
          ],
        },
      ],
    })).toEqual({
      message: "Question 1: mark exactly one option as the correct answer.",
      questionIndex: 0,
    });
  });
});
