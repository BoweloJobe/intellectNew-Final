import type {
  GetQuizTemplateInput,
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
  submitQuizAttempt(input: QuizSubmissionInput): Promise<QuizAttemptResult>;
  createStandaloneQuiz(input: StandaloneQuizInput): Promise<StandaloneQuizCreatedResult>;
}
