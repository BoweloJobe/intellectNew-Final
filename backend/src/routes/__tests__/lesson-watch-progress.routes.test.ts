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

const mockEnrollmentService = vi.hoisted(() => ({
  updateLessonWatchProgress: vi.fn(),
}))

vi.mock('../../services/enrollment.service.js', () => mockEnrollmentService)
vi.mock('../../controllers/course.controller.js', () => ({
  getLessonPage: vi.fn((_req: Request, res: Response) => res.json({ status: 'ok' })),
}))
vi.mock('../../controllers/quiz.controller.js', () => ({
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
  submitAttempt: vi.fn(),
  getMyAttempts: vi.fn(),
}))

import quizRouter from '../quiz.routes.js'

describe('PATCH /content/lessons/:lessonId/watch-progress', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    app = express()
    app.use(express.json())
    app.use('/content', quizRouter)
    app.use(errorHandler)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .patch('/content/lessons/lesson-1/watch-progress')
      .send({ watchedSeconds: 10 })

    expect(res.status).toBe(401)
    expect(mockEnrollmentService.updateLessonWatchProgress).not.toHaveBeenCalled()
  })

  it('updates watch progress for the authenticated user', async () => {
    mockEnrollmentService.updateLessonWatchProgress.mockResolvedValue({
      lessonId: 'lesson-1',
      courseId: 'course-1',
      watchedSeconds: 10,
      lastPositionSeconds: 5,
      updatedAt: new Date(),
    })

    const res = await request(app)
      .patch('/content/lessons/lesson-1/watch-progress')
      .set('Authorization', 'Bearer valid-student-token')
      .send({ watchedSeconds: 10, lastPositionSeconds: 5 })

    expect(res.status).toBe(200)
    expect(mockEnrollmentService.updateLessonWatchProgress).toHaveBeenCalledWith('student-1', 'lesson-1', {
      watchedSeconds: 10,
      lastPositionSeconds: 5,
    })
  })

  it('rejects invalid negative values before service dispatch', async () => {
    const res = await request(app)
      .patch('/content/lessons/lesson-1/watch-progress')
      .set('Authorization', 'Bearer valid-student-token')
      .send({ watchedSeconds: -1 })

    expect(res.status).toBe(400)
    expect(mockEnrollmentService.updateLessonWatchProgress).not.toHaveBeenCalled()
  })
})
