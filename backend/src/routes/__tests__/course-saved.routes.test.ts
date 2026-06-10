import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'

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
  createCourse: vi.fn((_req: Request, res: Response) => res.json({ handler: 'createCourse' })),
  getMyCourses: vi.fn((_req: Request, res: Response) => res.json({ handler: 'getMyCourses' })),
  getMyCourseDetail: vi.fn((_req: Request, res: Response) => res.json({ handler: 'getMyCourseDetail' })),
  listSavedCourses: vi.fn((_req: Request, res: Response) => res.json({ handler: 'listSavedCourses' })),
  saveCourse: vi.fn((req: Request, res: Response) => res.json({ handler: 'saveCourse', courseId: req.params.courseId })),
  unsaveCourse: vi.fn((req: Request, res: Response) => res.json({ handler: 'unsaveCourse', courseId: req.params.courseId })),
  getCourse: vi.fn((req: Request, res: Response) => res.json({ handler: 'getCourse', id: req.params.id })),
  updateCourse: vi.fn((_req: Request, res: Response) => res.json({ handler: 'updateCourse' })),
  deleteCourse: vi.fn((_req: Request, res: Response) => res.json({ handler: 'deleteCourse' })),
  submitForReview: vi.fn((_req: Request, res: Response) => res.json({ handler: 'submitForReview' })),
  createModule: vi.fn((_req: Request, res: Response) => res.json({ handler: 'createModule' })),
  updateModule: vi.fn((_req: Request, res: Response) => res.json({ handler: 'updateModule' })),
  deleteModule: vi.fn((_req: Request, res: Response) => res.status(204).end()),
  createLesson: vi.fn((_req: Request, res: Response) => res.json({ handler: 'createLesson' })),
  updateLesson: vi.fn((_req: Request, res: Response) => res.json({ handler: 'updateLesson' })),
  deleteLesson: vi.fn((_req: Request, res: Response) => res.status(204).end()),
  requestVideoUpload: vi.fn((_req: Request, res: Response) => res.json({ handler: 'requestVideoUpload' })),
  attachLessonVideo: vi.fn((_req: Request, res: Response) => res.json({ handler: 'attachLessonVideo' })),
}))

import courseRouter from '../course.routes.js'

describe('saved course routes', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/courses', courseRouter)
  })

  it('routes saved list before the generic course id route', async () => {
    const res = await request(app).get('/courses/saved')

    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('listSavedCourses')
  })

  it('routes save and unsave course actions', async () => {
    const save = await request(app).post('/courses/course-1/save')
    const unsave = await request(app).delete('/courses/course-1/save')

    expect(save.body).toEqual({ handler: 'saveCourse', courseId: 'course-1' })
    expect(unsave.body).toEqual({ handler: 'unsaveCourse', courseId: 'course-1' })
  })
})
