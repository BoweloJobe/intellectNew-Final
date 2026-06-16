import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'
import { AppError } from '../../errors/AppError.js'
import { errorHandler } from '../../middleware/error.middleware.js'

const mockQuizService = vi.hoisted(() => ({
  createQuiz: vi.fn(),
  updateQuiz: vi.fn(),
  addQuestion: vi.fn(),
}))

vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    ;(req as unknown as { user: { id: string; email: string; role: string } }).user = {
      id: 'instructor-1',
      email: 'instructor@example.com',
      role: 'INSTRUCTOR',
    }
    next()
  },
}))

vi.mock('../../middleware/role.middleware.js', () => ({
  requireRole:
    (..._roles: string[]) =>
    (_req: Request, _res: Response, next: NextFunction) =>
      next(),
}))

vi.mock('../../services/quiz.service.js', () => ({
  ...mockQuizService,
  getQuizForInstructor: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  createStandaloneQuiz: vi.fn(),
  getStudentAvailableQuizzes: vi.fn(),
  getStudentAttemptHistory: vi.fn(),
  getQuizForStudent: vi.fn(),
  getQuizById: vi.fn(),
  startAttempt: vi.fn(),
  submitAttempt: vi.fn(),
  getMyAttempts: vi.fn(),
}))

vi.mock('../../controllers/course.controller.js', () => ({
  getLessonPage: vi.fn((_req: Request, res: Response) => res.json({ handler: 'getLessonPage' })),
}))

vi.mock('../../controllers/enrollment.controller.js', () => ({
  updateLessonWatchProgress: vi.fn((_req: Request, res: Response) => res.json({ handler: 'updateLessonWatchProgress' })),
}))

import quizRouter from '../quiz.routes.js'

const READ_ONLY_MESSAGE = 'Approved courses are read-only. Create a revision before changing live content.'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/content', quizRouter)
  app.use(errorHandler)
  return app
}

describe('approved course quiz mutation route policy', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 409 when an owner creates a quiz for an approved course lesson', async () => {
    mockQuizService.createQuiz.mockRejectedValue(new AppError(409, READ_ONLY_MESSAGE))

    const res = await request(createApp())
      .post('/content/lessons/lesson-1/quiz')
      .send({ title: 'Live lesson quiz' })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ status: 'error', message: READ_ONLY_MESSAGE })
  })

  it('returns 409 when an owner updates an approved course lesson quiz', async () => {
    mockQuizService.updateQuiz.mockRejectedValue(new AppError(409, READ_ONLY_MESSAGE))

    const res = await request(createApp())
      .put('/content/quizzes/quiz-1')
      .send({ timeLimitSeconds: 300 })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ status: 'error', message: READ_ONLY_MESSAGE })
  })

  it('returns 409 when an owner adds a question to an approved course lesson quiz', async () => {
    mockQuizService.addQuestion.mockRejectedValue(new AppError(409, READ_ONLY_MESSAGE))

    const res = await request(createApp())
      .post('/content/quizzes/quiz-1/questions')
      .send({
        text: 'Question?',
        order: 0,
        questionType: 'MCQ',
        options: [
          { text: 'A', isCorrect: true, order: 0 },
          { text: 'B', isCorrect: false, order: 1 },
        ],
      })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ status: 'error', message: READ_ONLY_MESSAGE })
  })

  it('still returns success for draft/rejected quiz mutation routes when the service allows them', async () => {
    mockQuizService.updateQuiz.mockResolvedValue({ id: 'quiz-1', timeLimitSeconds: null })

    const res = await request(createApp())
      .put('/content/quizzes/quiz-1')
      .send({ timeLimitSeconds: null })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'ok',
      data: { quiz: { id: 'quiz-1', timeLimitSeconds: null } },
    })
  })
})
