import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'
import { AppError } from '../../errors/AppError.js'
import { errorHandler } from '../../middleware/error.middleware.js'

const mockCourseService = vi.hoisted(() => ({
  updateCourse: vi.fn(),
  createModule: vi.fn(),
  createLesson: vi.fn(),
  requestLessonVideoUpload: vi.fn(),
}))

vi.mock('../../middleware/auth.middleware.js', () => ({
  optionalAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
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

vi.mock('../../services/course.service.js', () => ({
  ...mockCourseService,
  listApprovedCourses: vi.fn(),
  createCourse: vi.fn(),
  getMyCourses: vi.fn(),
  getMyCourseDetail: vi.fn(),
  listSavedCourses: vi.fn(),
  saveCourse: vi.fn(),
  unsaveCourse: vi.fn(),
  getApprovedCourse: vi.fn(),
  deleteCourse: vi.fn(),
  submitCourseForReview: vi.fn(),
  updateModule: vi.fn(),
  deleteModule: vi.fn(),
  createStandaloneLesson: vi.fn(),
  updateLesson: vi.fn(),
  deleteLesson: vi.fn(),
  attachLessonVideo: vi.fn(),
}))

import courseRouter from '../course.routes.js'

const READ_ONLY_MESSAGE = 'Approved courses are read-only. Create a revision before changing live content.'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/courses', courseRouter)
  app.use(errorHandler)
  return app
}

describe('approved course mutation route policy', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 409 when an owner updates approved course metadata', async () => {
    mockCourseService.updateCourse.mockRejectedValue(new AppError(409, READ_ONLY_MESSAGE))

    const res = await request(createApp())
      .put('/courses/course-1')
      .send({ title: 'Changed title' })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ status: 'error', message: READ_ONLY_MESSAGE })
  })

  it('returns 409 when an owner adds module content to an approved course', async () => {
    mockCourseService.createModule.mockRejectedValue(new AppError(409, READ_ONLY_MESSAGE))

    const res = await request(createApp())
      .post('/courses/course-1/modules')
      .send({ title: 'New module', order: 0 })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ status: 'error', message: READ_ONLY_MESSAGE })
  })

  it('returns 409 when an owner adds lesson content to an approved course', async () => {
    mockCourseService.createLesson.mockRejectedValue(new AppError(409, READ_ONLY_MESSAGE))

    const res = await request(createApp())
      .post('/courses/course-1/modules/module-1/lessons')
      .send({ title: 'New lesson', order: 0 })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ status: 'error', message: READ_ONLY_MESSAGE })
  })

  it('returns 409 when an owner requests video upload for an approved course lesson', async () => {
    mockCourseService.requestLessonVideoUpload.mockRejectedValue(new AppError(409, READ_ONLY_MESSAGE))

    const res = await request(createApp())
      .post('/courses/course-1/modules/module-1/lessons/lesson-1/video-upload')
      .send({ filename: 'video.mp4', mimeType: 'video/mp4', fileSizeBytes: 1000 })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ status: 'error', message: READ_ONLY_MESSAGE })
  })

  it('still returns success for draft/rejected mutation routes when the service allows them', async () => {
    mockCourseService.updateCourse.mockResolvedValue({
      id: 'course-1',
      title: 'Changed title',
    })

    const res = await request(createApp())
      .put('/courses/course-1')
      .send({ title: 'Changed title' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'ok',
      data: { course: { id: 'course-1', title: 'Changed title' } },
    })
  })
})
