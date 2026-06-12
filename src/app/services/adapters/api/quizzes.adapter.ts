import type { QuizzesService } from "../../contracts/quizzes.contract";
import type {
  QuizAttemptResult,
  QuizDifficulty,
  QuizQuestionType,
  QuizzesPageData,
  QuizSubmissionInput,
  QuizTemplate,
  PracticeQuiz,
  PastQuiz,
  StandaloneQuizInput,
  StandaloneQuizCreatedResult,
  QuizAttemptStartResult,
} from "../../../models/quizzes";
import { ApiError, httpClient, toApiError } from "../../../api";
import { readStoredAuthSession } from "../../../auth/auth-storage";

// ─── Backend response shapes ──────────────────────────────────────────────────

interface BackendQuizOption {
  id: string;
  text: string;
  order: number;
}

interface BackendQuizQuestion {
  id: string;
  text: string;
  order: number;
  questionType: string;
  options: BackendQuizOption[];
}

interface BackendQuiz {
  id: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  passingScore: number;
  timeLimitSeconds: number | null;
  isPremium: boolean;
  category: string | null;
  difficulty?: string;
  questions: BackendQuizQuestion[];
}

interface BackendAttemptAnswer {
  questionId: string;
  questionType: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
  matchedKeywords: string[];
  correctOptionId: string;
  explanation: string;
}

interface BackendAttemptResult {
  id: string;
  score: number;          // 0–100 percentage
  passed: boolean;
  submittedAt: string;
  answers: BackendAttemptAnswer[];
  totalQuestions: number;
  marksEarned: number;
  marksTotal: number;
  passingScore: number;
}

interface BackendAttemptStart {
  attemptId: string;
  quizId: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  serverTime: string;
  timeLimitSeconds: number | null;
}

interface BackendAvailableQuiz {
  id: string;
  title: string;
  timeLimitSeconds: number | null;
  isPremium: boolean;
  category: string | null;
  difficulty?: string;
  // Lesson-bound quizzes have a lesson; standalone quizzes do not
  lesson?: {
    id: string;
    title: string;
    module: {
      course: {
        id: string;
        category: string;
        difficulty: string;
      };
    };
  } | null;
  _count: { questions: number };
}

interface BackendAttemptSummary {
  id: string;
  quizId: string;
  score: number;
  passed: boolean;
  submittedAt: string;
  quiz: {
    title: string;
    category: string | null;
    _count: { questions: number };
    lesson?: {
      module: {
        course: { category: string };
      };
    } | null;
  };
}

type BackendQuizResponse = { status: string; data: { quiz: BackendQuiz } };
type BackendAttemptStartResponse = { status: string; data: { attempt: BackendAttemptStart } };
type BackendAttemptResponse = { status: string; data: { result: BackendAttemptResult } };
type BackendAvailableQuizzesResponse = { status: string; data: { quizzes: BackendAvailableQuiz[] } };
type BackendAttemptHistoryResponse = { status: string; data: { attempts: BackendAttemptSummary[] } };
type BackendStandaloneQuizCreatedResponse = { status: string; data: { quiz: { id: string } } };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Throws an ApiError(401) immediately when no access token is stored.
 * Use this before every protected quiz request so the failure is explicit
 * ("Not signed in") rather than silently hitting the backend with no header
 * and getting an opaque "Authentication required" 401 from Express.
 */
function requireAuthToken(operation: string): string {
  const token = readStoredAuthSession()?.tokens?.accessToken;
  if (!token) {
    throw new ApiError({
      category: "http",
      status: 401,
      message: "You must be signed in to access quizzes. Please log in and try again.",
      operation,
    });
  }
  return token;
}

function mapCourseDifficulty(raw: string): QuizDifficulty {
  switch (raw.toUpperCase()) {
    case "INTERMEDIATE": return "Medium";
    case "ADVANCED": return "Hard";
    default: return "Easy";
  }
}

function mapQuestionType(raw: string): QuizQuestionType {
  return raw === "SHORT_ANSWER" ? "SHORT_ANSWER" : "MCQ";
}

function mapStandaloneQuizDifficulty(raw: string | undefined): QuizDifficulty {
  if (raw === "Hard") return "Hard";
  if (raw === "Medium") return "Medium";
  return "Easy";
}

function mapBackendQuiz(
  quiz: BackendQuiz,
  overrides?: { subject?: string; difficulty?: QuizDifficulty },
): QuizTemplate {
  return {
    id: quiz.id,
    subject: overrides?.subject ?? quiz.category ?? "Quiz",
    topic: quiz.title,
    difficulty: overrides?.difficulty ?? mapStandaloneQuizDifficulty(quiz.difficulty),
    estimatedDurationMinutes: quiz.timeLimitSeconds
      ? Math.ceil(quiz.timeLimitSeconds / 60)
      : Math.max(5, Math.ceil(quiz.questions.length * 1.5)),
    timeLimitSeconds: quiz.timeLimitSeconds ?? undefined,
    isPremium: quiz.isPremium,
    description: quiz.description ?? undefined,
    passingScore: quiz.passingScore,
    sourceLessonId: quiz.lessonId ?? undefined,
    sourceCourseId: undefined,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.text,
      questionType: mapQuestionType(q.questionType),
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      correctOptionId: "",
      explanation: "",
    })),
  };
}

function mapToPracticeQuiz(quiz: BackendAvailableQuiz): PracticeQuiz {
  if (quiz.lesson) {
    // Lesson-bound quiz
    return {
      subject: quiz.lesson.module.course.category,
      topic: quiz.lesson.title,
      questions: quiz._count.questions,
      difficulty: mapCourseDifficulty(quiz.lesson.module.course.difficulty),
      isPremium: quiz.isPremium,
      timeLimitSeconds: quiz.timeLimitSeconds ?? undefined,
      quizId: quiz.id,
      lessonId: quiz.lesson.id,
      courseId: quiz.lesson.module.course.id,
      isStandalone: false,
    };
  }
  // Standalone quiz
  return {
    subject: quiz.category ?? "General",
    topic: quiz.title,
    questions: quiz._count.questions,
    difficulty: mapStandaloneQuizDifficulty(quiz.difficulty),
    isPremium: quiz.isPremium,
    timeLimitSeconds: quiz.timeLimitSeconds ?? undefined,
    quizId: quiz.id,
    isStandalone: true,
  };
}

function mapToPastQuiz(attempt: BackendAttemptSummary): PastQuiz {
  const date = new Date(attempt.submittedAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const totalQuestions = attempt.quiz._count.questions;
  const correctAnswers = Math.round((attempt.score / 100) * totalQuestions);
  // Category: prefer quiz.category (standalone), fall back to lesson's course category
  const subject =
    attempt.quiz.category ??
    attempt.quiz.lesson?.module.course.category ??
    "General";
  return {
    subject,
    topic: attempt.quiz.title,
    date: dateStr,
    score: attempt.score,
    maxScore: 100,
    timeTaken: `${correctAnswers}/${totalQuestions} correct`,
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class ApiQuizzesAdapter implements QuizzesService {
  async getQuizzesPageData(): Promise<QuizzesPageData> {
    try {
      requireAuthToken("quizzes.getQuizzesPageData");
      const [availableRes, attemptsRes] = await Promise.all([
        httpClient.get<BackendAvailableQuizzesResponse>("/content/quizzes/my/available"),
        httpClient.get<BackendAttemptHistoryResponse>("/content/quizzes/my/attempts"),
      ]);

      return {
        upcomingQuizzes: [],
        practiceQuizzes: availableRes.data.quizzes.map(mapToPracticeQuiz),
        pastQuizzes: attemptsRes.data.attempts.map(mapToPastQuiz),
      };
    } catch (error) {
      throw toApiError(error, { operation: "quizzes.getQuizzesPageData" });
    }
  }

  async getQuizTemplate(input: Parameters<QuizzesService["getQuizTemplate"]>[0]): Promise<QuizTemplate> {
    try {
      if (input.lessonId) {
        requireAuthToken("quizzes.getQuizTemplate");
        const response = await httpClient.get<BackendQuizResponse>(
          `/content/lessons/${encodeURIComponent(input.lessonId)}/quiz`,
        );
        return mapBackendQuiz(response.data.quiz, {
          subject: input.subject,
          difficulty: input.difficulty,
        });
      }

      if (input.quizId) {
        requireAuthToken("quizzes.getQuizTemplate");
        const response = await httpClient.get<BackendQuizResponse>(
          `/content/quizzes/${encodeURIComponent(input.quizId)}`,
        );
        return mapBackendQuiz(response.data.quiz, {
          subject: input.subject,
          difficulty: input.difficulty,
        });
      }

      throw new Error("getQuizTemplate requires lessonId or quizId");
    } catch (error) {
      throw toApiError(error, { operation: "quizzes.getQuizTemplate" });
    }
  }

  async startQuizAttempt(quizId: string): Promise<QuizAttemptStartResult> {
    try {
      requireAuthToken("quizzes.startQuizAttempt");
      const response = await httpClient.post<BackendAttemptStartResponse>(
        `/content/quizzes/${encodeURIComponent(quizId)}/attempts/start`,
      );

      return response.data.attempt;
    } catch (error) {
      throw toApiError(error, { operation: "quizzes.startQuizAttempt" });
    }
  }

  async submitQuizAttempt(input: QuizSubmissionInput): Promise<QuizAttemptResult> {
    const answers = Object.entries(input.answersByQuestionId).map(([questionId, answer]) => {
      if (answer?.questionType === "SHORT_ANSWER") {
        return {
          questionId,
          textAnswer: answer.textAnswer,
        };
      }

      return {
        questionId,
        selectedOptionId: answer?.questionType === "MCQ" ? answer.selectedOptionId : "",
      };
    });

    try {
      requireAuthToken("quizzes.submitQuizAttempt");
      const response = await httpClient.post<BackendAttemptResponse>(
        `/content/quizzes/${encodeURIComponent(input.quizId)}/attempt`,
        { body: { attemptId: input.attemptId, answers } },
      );
      const result = response.data.result;

      return {
        quizId: input.quizId,
        score: result.marksEarned,
        maxScore: result.marksTotal,
        percentage: result.score,
        elapsedSeconds: Math.max(0, Math.round(input.elapsedSeconds)),
        questionResults: result.answers.map((a) => ({
          questionId: a.questionId,
          questionType: a.questionType as import("../../../models/quizzes").QuizQuestionType,
          selectedOptionId: a.selectedOptionId ?? undefined,
          correctOptionId: a.correctOptionId || undefined,
          isCorrect: a.isCorrect,
          explanation: a.explanation,
          marksAwarded: a.marksAwarded,
          maxMarks: a.maxMarks,
          textAnswer: a.textAnswer ?? undefined,
          matchedKeywords: a.matchedKeywords,
        })),
      };
    } catch (error) {
      throw toApiError(error, { operation: "quizzes.submitQuizAttempt" });
    }
  }

  async createStandaloneQuiz(input: StandaloneQuizInput): Promise<StandaloneQuizCreatedResult> {
    // ── Diagnostic (DEV only): prove adapter mode, token presence, and stored role ──
    if (import.meta.env.DEV) {
      const diagSession = readStoredAuthSession();
      const diagToken = diagSession?.tokens?.accessToken;
      const diagRole = diagSession?.user?.role;
      console.info(
        "[quizzes.createStandaloneQuiz] adapter=api",
        `token=${diagToken ? "present" : "MISSING"}`,
        `role=${diagRole ?? "NONE"}`,
      );
    }
    // ── End diagnostic ──
    try {
      requireAuthToken("quizzes.createStandaloneQuiz");
      const response = await httpClient.post<BackendStandaloneQuizCreatedResponse>(
        "/content/quizzes/standalone",
        { body: input },
      );
      if (import.meta.env.DEV) {
        console.info(
          "[quizzes.createStandaloneQuiz] create succeeded",
          `quizId=${response.data.quiz.id}`,
        );
      }
      return { quizId: response.data.quiz.id };
    } catch (error) {
      const apiErr = toApiError(error, { operation: "quizzes.createStandaloneQuiz" });
      if (import.meta.env.DEV) {
        console.warn(
          "[quizzes.createStandaloneQuiz] create failed",
          `status=${apiErr.status ?? "network"}`,
          `message=${apiErr.message}`,
        );
      }
      throw apiErr;
    }
  }
}
