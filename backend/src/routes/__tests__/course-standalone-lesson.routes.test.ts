import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'

vi.mock('../../middleware/auth.middleware.js', () => ({
  optionalAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('../../middleware/role.middleware.js', () => ({
  requireRole:
    (..._roles: string[]) =>
    (_req: Request, _res: Response, next: NextFunction) =>
      next(),
}))

vi.mock('../../controllers/course.controller.js', () => ({
  listCourses: vi.fn((_req: Request, res: Response) => res.json({ handler: 'listCourses' })),
  createCourse: vi.fn((_req: Request, res: Response) => res.status(201).json({ handler: 'createCourse' })),
  getMyCourses: vi.fn((_req: Request, res: Response) => res.json({ handler: 'getMyCourses' })),
  getMyCourseDetail: vi.fn((_req: Request, res: Response) => res.json({ handler: 'getMyCourseDetail' })),
  listSavedCourses: vi.fn((_req: Request, res: Response) => res.json({ handler: 'listSavedCourses' })),
  saveCourse: vi.fn((_req: Request, res: Response) => res.json({ handler: 'saveCourse' })),
  unsaveCourse: vi.fn((_req: Request, res: Response) => res.json({ handler: 'unsaveCourse' })),
  getCourse: vi.fn((_req: Request, res: Response) => res.json({ handler: 'getCourse' })),
  updateCourse: vi.fn((_req: Request, res: Response) => res.json({ handler: 'updateCourse' })),
  deleteCourse: vi.fn((_req: Request, res: Response) => res.json({ handler: 'deleteCourse' })),
  submitForReview: vi.fn((_req: Request, res: Response) => res.json({ handler: 'submitForReview' })),
  createModule: vi.fn((_req: Request, res: Response) => res.status(201).json({ handler: 'createModule' })),
  updateModule: vi.fn((_req: Request, res: Response) => res.json({ handler: 'updateModule' })),
  deleteModule: vi.fn((_req: Request, res: Response) => res.status(204).end()),
  createLesson: vi.fn((_req: Request, res: Response) => res.status(201).json({ handler: 'createLesson' })),
  createStandaloneLesson: vi.fn((_req: Request, res: Response) =>
    res.status(201).json({ handler: 'createStandaloneLesson' }),
  ),
  updateLesson: vi.fn((_req: Request, res: Response) => res.json({ handler: 'updateLesson' })),
  deleteLesson: vi.fn((_req: Request, res: Response) => res.status(204).end()),
  requestVideoUpload: vi.fn((_req: Request, res: Response) => res.json({ handler: 'requestVideoUpload' })),
  attachLessonVideo: vi.fn((_req: Request, res: Response) => res.json({ handler: 'attachLessonVideo' })),
}))

import courseRouter from '../course.routes.js'

describe('standalone lesson route dispatch', () => {
  it('routes POST /courses/:courseId/lessons/standalone to createStandaloneLesson', async () => {
    const app = express()
    app.use(express.json())
    app.use('/courses', courseRouter)

    const res = await request(app).post('/courses/course-42/lessons/standalone').send({})

    expect(res.status).toBe(201)
    expect(res.body.handler).toBe('createStandaloneLesson')
  })
})
