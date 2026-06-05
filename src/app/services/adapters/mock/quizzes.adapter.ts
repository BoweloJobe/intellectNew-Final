import {
  getQuizTemplateMock,
  quizzesPageMock,
  submitQuizAttemptMock,
  SEEDED_QUIZ_TEMPLATES,
} from "../../../mocks/quizzes.mock";
import type { QuizQuestion, QuizTemplate, PracticeQuiz, StandaloneQuizInput, StandaloneQuizCreatedResult } from "../../../models/quizzes";
import type { InstructorManagedCourse } from "../../../models/courses";
import type { QuizzesService } from "../../contracts/quizzes.contract";
import { withMockDelay } from "../../mock-utils";
import { getAllMockManagedCourses } from "./courses.adapter";
import { parseKeywords, gradeKeywords } from "../../../utils/keyword-grader";

// ---------------------------------------------------------------------------
// Helpers: find instructor-authored quiz templates from the course store
// ---------------------------------------------------------------------------

function courseDifficultyToQuizDifficulty(
  diff: InstructorManagedCourse["difficulty"],
): QuizTemplate["difficulty"] {
  if (diff === "advanced") return "Hard";
  if (diff === "intermediate") return "Medium";
  return "Easy";
}

function buildInstructorQuizTemplate(
  lessonId: string,
  lessonTitle: string,
  quizId: string,
  questions: QuizQuestion[],
  course: InstructorManagedCourse,
  estimatedMinutes: number,
): QuizTemplate {
  return {
    id: quizId,
    subject: course.category,
    topic: lessonTitle,
    difficulty: courseDifficultyToQuizDifficulty(course.difficulty),
    estimatedDurationMinutes: Math.max(5, estimatedMinutes),
    sourceLessonId: lessonId,
    sourceCourseId: course.id,
    questions,
  };
}

function findInstructorQuizTemplateById(quizId: string): QuizTemplate | null {
  for (const course of getAllMockManagedCourses()) {
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (
          lesson.quizId === quizId &&
          lesson.quizQuestions &&
          lesson.quizQuestions.length > 0
        ) {
          return buildInstructorQuizTemplate(
            lesson.id,
            lesson.title,
            quizId,
            lesson.quizQuestions,
            course,
            lesson.estimatedCompletionTimeMinutes ?? 15,
          );
        }
      }
    }
  }
  return null;
}

function getInstructorPracticeQuizzes(): PracticeQuiz[] {
  const results: PracticeQuiz[] = [];

  for (const course of getAllMockManagedCourses()) {
    if (course.publicationStatus !== "approved") {
      continue;
    }

    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (
          lesson.quizAvailable &&
          lesson.quizId &&
          lesson.quizQuestions &&
          lesson.quizQuestions.length > 0
        ) {
          results.push({
            subject: course.category,
            topic: lesson.title,
            questions: lesson.quizQuestions.length,
            difficulty: courseDifficultyToQuizDifficulty(course.difficulty),
            quizId: lesson.quizId,
            lessonId: lesson.id,
            courseId: course.id,
            isStandalone: false,
          });
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// In-memory standalone quiz store (session-scoped, mirrors backend persistence)
// ---------------------------------------------------------------------------

interface StoredStandaloneQuiz {
  template: QuizTemplate;
  practiceCard: PracticeQuiz;
}

// Module-level store — persists for the browser session (survives React re-renders).
const standaloneQuizStore = new Map<string, StoredStandaloneQuiz>();

// Pre-seed with the curated mock quiz content so static cards are fully functional.
for (const template of SEEDED_QUIZ_TEMPLATES) {
  const practiceCard = quizzesPageMock.practiceQuizzes.find((q) => q.quizId === template.id);
  if (practiceCard) {
    standaloneQuizStore.set(template.id, { template, practiceCard });
  }
}

function buildStandaloneTemplate(quizId: string, input: StandaloneQuizInput): QuizTemplate {
  const questions: QuizQuestion[] = input.questions.map((q, qIdx) => {
    if (q.questionType === "SHORT_ANSWER") {
      return {
        id: `${quizId}-q${qIdx}`,
        prompt: q.text,
        questionType: "SHORT_ANSWER",
        options: [],
        correctOptionId: "",
        explanation: q.explanation ?? "",
        answerKey: q.answerKey ?? "",
      };
    }
    // MCQ: generate stable option IDs and find the correct one
    const optionsWithIds = q.options.map((o, oIdx) => ({
      id: `${quizId}-q${qIdx}-o${oIdx}`,
      text: o.text,
      isCorrect: o.isCorrect,
    }));
    const correctOption = optionsWithIds.find((o) => o.isCorrect);
    return {
      id: `${quizId}-q${qIdx}`,
      prompt: q.text,
      questionType: "MCQ",
      options: optionsWithIds.map(({ id, text }) => ({ id, text })),
      correctOptionId: correctOption?.id ?? optionsWithIds[0]?.id ?? "",
      explanation: q.explanation ?? "",
    };
  });

  return {
    id: quizId,
    subject: input.category,
    topic: input.title,
    difficulty: input.difficulty ?? "Medium",
    estimatedDurationMinutes: Math.max(5, Math.ceil(input.questions.length * 1.5)),
    timeLimitSeconds: input.timeLimitSeconds,
    isPremium: input.isPremium,
    description: input.description,
    passingScore: input.passingScore,
    questions,
  };
}

function buildStandalonePracticeCard(quizId: string, input: StandaloneQuizInput): PracticeQuiz {
  return {
    subject: input.category,
    topic: input.title,
    questions: input.questions.length,
    difficulty: input.difficulty ?? "Medium",
    isPremium: input.isPremium,
    timeLimitSeconds: input.timeLimitSeconds,
    quizId,
    isStandalone: true,
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class MockQuizzesAdapter implements QuizzesService {
  async getQuizzesPageData() {
    const base = quizzesPageMock;
    const instructorPractice = getInstructorPracticeQuizzes();
    // Include any standalone quizzes created this session
    const sessionStandalone = [...standaloneQuizStore.values()].map((s) => s.practiceCard);

    return withMockDelay({
      ...base,
      practiceQuizzes: [...base.practiceQuizzes, ...instructorPractice, ...sessionStandalone],
    });
  }

  async getQuizTemplate(input: Parameters<QuizzesService["getQuizTemplate"]>[0]) {
    // 1. Session-created standalone quiz — check first so the real quiz is returned
    if (input.quizId) {
      const stored = standaloneQuizStore.get(input.quizId);
      if (stored) {
        return withMockDelay(stored.template);
      }
    }

    // 2. Instructor-authored quiz identified by quizId (course-lesson linked)
    if (input.quizId) {
      const instructorTemplate = findInstructorQuizTemplateById(input.quizId);
      if (instructorTemplate) {
        return withMockDelay(instructorTemplate);
      }
    }

    // 3. Instructor-authored quiz identified by lessonId
    if (input.lessonId) {
      for (const course of getAllMockManagedCourses()) {
        for (const module of course.modules) {
          for (const lesson of module.lessons) {
            if (
              lesson.id === input.lessonId &&
              lesson.quizId &&
              lesson.quizQuestions &&
              lesson.quizQuestions.length > 0
            ) {
              return withMockDelay(
                buildInstructorQuizTemplate(
                  lesson.id,
                  lesson.title,
                  lesson.quizId,
                  lesson.quizQuestions,
                  course,
                  lesson.estimatedCompletionTimeMinutes ?? 15,
                ),
              );
            }
          }
        }
      }
    }

    // 4. Generic fallback (static subject-based mock)
    return withMockDelay(getQuizTemplateMock(input));
  }

  async submitQuizAttempt(input: Parameters<QuizzesService["submitQuizAttempt"]>[0]) {
    // 1. Session-created standalone quiz — grade against real stored answers
    const stored = standaloneQuizStore.get(input.quizId);
    if (stored) {
      return withMockDelay(gradeAttempt(stored.template, input));
    }

    // 2. Instructor-authored lesson quiz
    const instructorTemplate = findInstructorQuizTemplateById(input.quizId);
    if (instructorTemplate) {
      return withMockDelay(gradeAttempt(instructorTemplate, input));
    }

    return withMockDelay(submitQuizAttemptMock(input));
  }

  async createStandaloneQuiz(input: StandaloneQuizInput): Promise<StandaloneQuizCreatedResult> {
    const quizId = `mock-quiz-${Date.now()}`;
    const template = buildStandaloneTemplate(quizId, input);
    const practiceCard = buildStandalonePracticeCard(quizId, input);
    standaloneQuizStore.set(quizId, { template, practiceCard });
    return withMockDelay({ quizId });
  }
}

// ---------------------------------------------------------------------------
// Shared grading helper
// ---------------------------------------------------------------------------

function gradeAttempt(
  template: QuizTemplate,
  input: Parameters<QuizzesService["submitQuizAttempt"]>[0],
) {
  let totalMarksEarned = 0;
  let totalMarksAvailable = 0;

  const questionResults = template.questions.map((question) => {
    const value = input.answersByQuestionId[question.id];

    if (question.questionType === "SHORT_ANSWER") {
      const keywords = parseKeywords(question.answerKey);
      const maxMarks = keywords.length > 0 ? keywords.length : 1;
      const studentText = value ?? "";
      const { marksAwarded, matchedKeywords } =
        keywords.length > 0
          ? gradeKeywords(studentText, keywords)
          : { marksAwarded: 0, matchedKeywords: [] };

      totalMarksEarned += marksAwarded;
      totalMarksAvailable += maxMarks;

      return {
        questionId: question.id,
        questionType: "SHORT_ANSWER" as const,
        isCorrect: marksAwarded > 0,
        explanation: question.explanation,
        marksAwarded,
        maxMarks,
        textAnswer: studentText,
        matchedKeywords,
      };
    }

    // MCQ
    const isCorrect = Boolean(value) && value === question.correctOptionId;
    totalMarksEarned += isCorrect ? 1 : 0;
    totalMarksAvailable += 1;

    return {
      questionId: question.id,
      questionType: "MCQ" as const,
      selectedOptionId: value ?? "",
      correctOptionId: question.correctOptionId,
      isCorrect,
      explanation: question.explanation,
      marksAwarded: isCorrect ? 1 : 0,
      maxMarks: 1,
      matchedKeywords: [] as string[],
    };
  });

  return {
    quizId: template.id,
    score: totalMarksEarned,
    maxScore: totalMarksAvailable,
    percentage: Math.round((totalMarksEarned / Math.max(totalMarksAvailable, 1)) * 100),
    elapsedSeconds: Math.max(0, Math.floor(input.elapsedSeconds)),
    questionResults,
  };
}