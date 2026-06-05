import { Request, Response, NextFunction } from 'express'
import { validate } from '../lib/validate.js'
import * as QuizService from '../services/quiz.service.js'
import {
  createQuizSchema,
  updateQuizSchema,
  createQuestionSchema,
  updateQuestionSchema,
  createStandaloneQuizSchema,
  submitAttemptSchema,
} from '../validation/quiz.validation.js'

// ─── Instructor ───────────────────────────────────────────────────────────────

export async function createQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(createQuizSchema, req.body)
    const quiz = await QuizService.createQuiz(req.params.lessonId, req.user!.id, input)
    res.status(201).json({ status: 'ok', data: { quiz } })
  } catch (err) { next(err) }
}

export async function createStandaloneQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(createStandaloneQuizSchema, req.body)
    const quiz = await QuizService.createStandaloneQuiz(req.user!.id, input)
    res.status(201).json({ status: 'ok', data: { quiz } })
  } catch (err) { next(err) }
}

export async function updateQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(updateQuizSchema, req.body)
    const quiz = await QuizService.updateQuiz(req.params.quizId, req.user!.id, input)
    res.json({ status: 'ok', data: { quiz } })
  } catch (err) { next(err) }
}

export async function getQuizInstructor(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const quiz = await QuizService.getQuizForInstructor(req.params.lessonId, req.user!.id)
    res.json({ status: 'ok', data: { quiz } })
  } catch (err) { next(err) }
}

export async function addQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(createQuestionSchema, req.body)
    const question = await QuizService.addQuestion(req.params.quizId, req.user!.id, input)
    res.status(201).json({ status: 'ok', data: { question } })
  } catch (err) { next(err) }
}

export async function updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(updateQuestionSchema, req.body)
    const question = await QuizService.updateQuestion(req.params.questionId, req.user!.id, input)
    res.json({ status: 'ok', data: { question } })
  } catch (err) { next(err) }
}

export async function deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await QuizService.deleteQuestion(req.params.questionId, req.user!.id)
    res.json({ status: 'ok', message: 'Question deleted' })
  } catch (err) { next(err) }
}

// ─── Student ──────────────────────────────────────────────────────────────────

export async function getQuizStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const quiz = await QuizService.getQuizForStudent(req.params.lessonId, req.user!.id)
    res.json({ status: 'ok', data: { quiz } })
  } catch (err) { next(err) }
}

export async function getQuizStudentById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const quiz = await QuizService.getQuizById(req.params.quizId, req.user!.id)
    res.json({ status: 'ok', data: { quiz } })
  } catch (err) { next(err) }
}

export async function submitAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = validate(submitAttemptSchema, req.body)
    const result = await QuizService.submitAttempt(req.params.quizId, req.user!.id, input)
    res.json({ status: 'ok', data: { result } })
  } catch (err) { next(err) }
}

export async function getMyAttempts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attempts = await QuizService.getMyAttempts(req.params.quizId, req.user!.id)
    res.json({ status: 'ok', data: { attempts } })
  } catch (err) { next(err) }
}

export async function getMyAvailableQuizzes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const quizzes = await QuizService.getStudentAvailableQuizzes(req.user!.id)
    res.json({ status: 'ok', data: { quizzes } })
  } catch (err) { next(err) }
}

export async function getMyAttemptHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const attempts = await QuizService.getStudentAttemptHistory(req.user!.id)
    res.json({ status: 'ok', data: { attempts } })
  } catch (err) { next(err) }
}
