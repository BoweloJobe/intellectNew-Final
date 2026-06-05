import type {
  GetQuizTemplateInput,
  QuizAttemptResult,
  QuizzesPageData,
  QuizSubmissionInput,
  QuizTemplate,
  StandaloneQuizInput,
  StandaloneQuizCreatedResult,
} from "../models/quizzes";
import { getQuizzesService } from "./factory/service-registry";

export async function getQuizzesPageData(): Promise<QuizzesPageData> {
  return getQuizzesService().getQuizzesPageData();
}

export async function getQuizTemplate(input: GetQuizTemplateInput): Promise<QuizTemplate> {
  return getQuizzesService().getQuizTemplate(input);
}

export async function submitQuizAttempt(input: QuizSubmissionInput): Promise<QuizAttemptResult> {
  return getQuizzesService().submitQuizAttempt(input);
}

export async function createStandaloneQuiz(input: StandaloneQuizInput): Promise<StandaloneQuizCreatedResult> {
  return getQuizzesService().createStandaloneQuiz(input);
}
