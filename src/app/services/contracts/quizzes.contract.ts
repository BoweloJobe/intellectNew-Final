import type {
  GetQuizTemplateInput,
  QuizAttemptStartResult,
  QuizAttemptResult,
  QuizzesPageData,
  QuizSubmissionInput,
  QuizTemplate,
  StandaloneQuizInput,
  StandaloneQuizCreatedResult,
} from "../../models/quizzes";

export interface QuizzesService {
  getQuizzesPageData(): Promise<QuizzesPageData>;
  getQuizTemplate(input: GetQuizTemplateInput): Promise<QuizTemplate>;
  startQuizAttempt(quizId: string): Promise<QuizAttemptStartResult>;
  submitQuizAttempt(input: QuizSubmissionInput): Promise<QuizAttemptResult>;
  createStandaloneQuiz(input: StandaloneQuizInput): Promise<StandaloneQuizCreatedResult>;
}
