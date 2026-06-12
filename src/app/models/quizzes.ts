export type QuizDifficulty = "Easy" | "Medium" | "Hard";
export type QuizQuestionType = "MCQ" | "SHORT_ANSWER";

export interface QuizQuestionOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  questionType: QuizQuestionType;
  options: QuizQuestionOption[];
  correctOptionId: string;
  explanation: string;
  /**
   * Comma-separated grading keywords for SHORT_ANSWER questions.
   * Only populated by the mock adapter (never sent by the real API — grading
   * happens server-side and the backend never exposes keywords to students).
   */
  answerKey?: string;
}

export interface QuizTemplate {
  id: string;
  subject: string;
  topic: string;
  difficulty: QuizDifficulty;
  estimatedDurationMinutes: number;
  /** Seconds allowed; undefined/null means untimed */
  timeLimitSeconds?: number;
  /** Whether a Pro subscription is required to take this quiz */
  isPremium?: boolean;
  /** Short description written by the instructor */
  description?: string;
  /** Minimum score (0–100) required to pass */
  passingScore?: number;
  sourceLessonId?: string;
  sourceCourseId?: string;
  questions: QuizQuestion[];
}

export interface GetQuizTemplateInput {
  quizId?: string;
  lessonId?: string;
  courseId?: string;
  subject?: string;
  topic?: string;
  difficulty?: QuizDifficulty;
  questionCount?: number;
}

export interface QuizSubmissionInput {
  quizId: string;
  attemptId?: string;
  answersByQuestionId: Record<string, QuizAnswerSubmission | undefined>;
  elapsedSeconds: number;
}

export type QuizAnswerSubmission =
  | { questionType: "MCQ"; selectedOptionId: string }
  | { questionType: "SHORT_ANSWER"; textAnswer: string };

export interface QuizAttemptStartResult {
  attemptId: string;
  quizId: string;
  status: string;
  startedAt: string;
  expiresAt?: string | null;
  serverTime: string;
  timeLimitSeconds?: number | null;
}

export interface QuizQuestionResult {
  questionId: string;
  questionType?: QuizQuestionType;
  /** MCQ: the option id the student chose. Absent for SHORT_ANSWER. */
  selectedOptionId?: string;
  /** MCQ: the correct option id. Absent for SHORT_ANSWER. */
  correctOptionId?: string;
  isCorrect: boolean;
  explanation: string;
  /** Marks earned for this question (1 for correct MCQ; 0–N for SHORT_ANSWER). */
  marksAwarded?: number;
  /** Maximum marks available for this question. */
  maxMarks?: number;
  /** SHORT_ANSWER: the raw text the student submitted. */
  textAnswer?: string;
  /** SHORT_ANSWER: which keywords were found in the student's answer. */
  matchedKeywords?: string[];
}

export interface QuizAttemptResult {
  quizId: string;
  score: number;
  maxScore: number;
  percentage: number;
  elapsedSeconds: number;
  questionResults: QuizQuestionResult[];
}

export interface UpcomingQuiz {
  subject: string;
  topic: string;
  date: string;
  time: string;
  duration: string;
  questions: number;
  difficulty: QuizDifficulty;
}

export interface PastQuiz {
  subject: string;
  topic: string;
  date: string;
  score: number;
  maxScore: number;
  timeTaken: string;
}

export interface PracticeQuiz {
  subject: string;
  topic: string;
  questions: number;
  difficulty: QuizDifficulty;
  /** Whether a Pro subscription is required to start this quiz */
  isPremium?: boolean;
  /** Whether this quiz has a time limit */
  timeLimitSeconds?: number;
  /** Direct quiz id for instructor-authored lesson quizzes. */
  quizId?: string;
  /** Lesson id the quiz belongs to, for navigation. */
  lessonId?: string;
  /** Course id for lesson navigation context. */
  courseId?: string;
  /** True for standalone instructor-created quizzes (not tied to a lesson). */
  isStandalone?: boolean;
}

export interface QuizzesPageData {
  upcomingQuizzes: UpcomingQuiz[];
  pastQuizzes: PastQuiz[];
  practiceQuizzes: PracticeQuiz[];
}

// ─── Instructor quiz authoring ────────────────────────────────────────────────

export interface StandaloneQuizQuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

export interface StandaloneQuizQuestionInput {
  text: string;
  questionType: QuizQuestionType;
  explanation?: string;
  /** Expected answer for SHORT_ANSWER questions (instructor reference) */
  answerKey?: string;
  options: StandaloneQuizQuestionOptionInput[];
}

export interface StandaloneQuizInput {
  title: string;
  description?: string;
  category: string;
  difficulty?: QuizDifficulty;
  passingScore?: number;
  timeLimitSeconds?: number;
  isPremium?: boolean;
  questions: StandaloneQuizQuestionInput[];
}

export interface StandaloneQuizCreatedResult {
  quizId: string;
}
