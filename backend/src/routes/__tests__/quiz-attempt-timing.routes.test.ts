import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'
import { AppError } from '../../errors/AppError.js'
import { errorHandler } from '../../middleware/error.middleware.js'

vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers.authorization !== 'Bearer valid-student-token') {
      next(new AppError(401, 'Authentication required'))
      return
    }
    ;(req as unknown as { user: { id: string; role: string } }).user = {
      id: 'student-1',
      role: 'STUDENT',
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

vi.mock('../../controllers/course.controller.js', () => ({
  getLessonPage: vi.fn((_req: Request, res: Response) => res.json({ status: 'ok' })),
}))
vi.mock('../../controllers/enrollment.controller.js', () => ({
  updateLessonWatchProgress: vi.fn(),
}))

const mockQuizController = vi.hoisted(() => ({
  createQuiz: vi.fn(),
  getQuizInstructor: vi.fn(),
  updateQuiz: vi.fn(),
  addQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  createStandaloneQuiz: vi.fn(),
  getMyAvailableQuizzes: vi.fn(),
  getMyAttemptHistory: vi.fn(),
  getQuizStudent: vi.fn(),
  getQuizStudentById: vi.fn(),
  startAttempt: vi.fn(),
  submitAttempt: vi.fn(),
  getMyAttempts: vi.fn(),
}))

vi.mock('../../controllers/quiz.controller.js', () => mockQuizController)

import quizRouter from '../quiz.routes.js'

describe('POST /content/quizzes/:quizId/attempts/start', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    app = express()
    app.use(express.json())
    app.use('/content', quizRouter)
    app.use(errorHandler)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/content/quizzes/quiz-1/attempts/start')

    expect(res.status).toBe(401)
    expect(mockQuizController.startAttempt).not.toHaveBeenCalled()
  })

  it('routes authenticated start requests to the quiz controller', async () => {
    mockQuizController.startAttempt.mockImplementation((_req: Request, res: Response) => {
      res.status(201).json({ status: 'ok', data: { attempt: { attemptId: 'attempt-1' } } })
    })

    const res = await request(app)
      .post('/content/quizzes/quiz-1/attempts/start')
      .set('Authorization', 'Bearer valid-student-token')

    expect(res.status).toBe(201)
    expect(mockQuizController.startAttempt).toHaveBeenCalled()
  })
})
