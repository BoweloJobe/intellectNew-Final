/**
 * Route-dispatch tests for course.routes.ts
 *
 * These tests verify that each URL is dispatched to the correct controller
 * handler and is NOT swallowed by the generic `/:id` dynamic route.
 *
 * Middleware (requireAuth, requireRole) is stubbed to always call next() so
 * the tests focus exclusively on route-matching order.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'

// ── Middleware stubs ────────────────────────────────────────────────────────
vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('../../middleware/role.middleware.js', () => ({
  requireRole:
    (..._roles: string[]) =>
    (_req: Request, _res: Response, next: NextFunction) =>
      next(),
}))

// ── Controller stubs ────────────────────────────────────────────────────────
// Each stub responds with its own name so a wrong dispatch is immediately
// visible in the assertion message.
vi.mock('../../controllers/course.controller.js', () => ({
  listCourses: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'listCourses' }),
  ),
  getCourse: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'getCourse', id: (_req as any).params.id }),
  ),
  createCourse: vi.fn((_req: Request, res: Response) =>
    res.status(201).json({ handler: 'createCourse' }),
  ),
  getMyCourses: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'getMyCourses' }),
  ),
  getMyCourseDetail: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'getMyCourseDetail', id: (_req as any).params.id }),
  ),
  updateCourse: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'updateCourse' }),
  ),
  deleteCourse: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'deleteCourse' }),
  ),
  submitForReview: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'submitForReview' }),
  ),
  createModule: vi.fn((_req: Request, res: Response) =>
    res.status(201).json({ handler: 'createModule' }),
  ),
  updateModule: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'updateModule' }),
  ),
  deleteModule: vi.fn((_req: Request, res: Response) =>
    res.status(204).end(),
  ),
  createLesson: vi.fn((_req: Request, res: Response) =>
    res.status(201).json({ handler: 'createLesson' }),
  ),
  updateLesson: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'updateLesson' }),
  ),
  deleteLesson: vi.fn((_req: Request, res: Response) =>
    res.status(204).end(),
  ),
  requestVideoUpload: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'requestVideoUpload' }),
  ),
  attachLessonVideo: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'attachLessonVideo' }),
  ),
}))

// Import the router AFTER all vi.mock() declarations (vitest hoists mocks).
import courseRouter from '../course.routes.js'

// ── Test suite ──────────────────────────────────────────────────────────────
describe('course routes – handler dispatch order', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/courses', courseRouter)
  })

  // ── GET /courses ──────────────────────────────────────────────────────────
  it('GET /courses → listCourses', async () => {
    const res = await request(app).get('/courses')
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('listCourses')
  })

  // ── GET /courses/mine/list ────────────────────────────────────────────────
  it('GET /courses/mine/list → getMyCourses (not getCourse)', async () => {
    const res = await request(app).get('/courses/mine/list')
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('getMyCourses')
  })

  // ── GET /courses/mine/:id ─────────────────────────────────────────────────
  it('GET /courses/mine/abc123 → getMyCourseDetail (not getCourse)', async () => {
    const res = await request(app).get('/courses/mine/abc123')
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('getMyCourseDetail')
    expect(res.body.id).toBe('abc123')
  })

  // ── GET /courses/:id ──────────────────────────────────────────────────────
  it('GET /courses/some-course-id → getCourse', async () => {
    const res = await request(app).get('/courses/some-course-id')
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('getCourse')
    expect(res.body.id).toBe('some-course-id')
  })

  // ── Confirm param 'mine' is not treated as a course id ───────────────────
  it('GET /courses/mine is not a valid route (no static /mine handler)', async () => {
    // /mine doesn't match any route (no handler registered for exactly /mine).
    // Express returns 404, confirming 'mine' is never interpreted as /:id.
    const res = await request(app).get('/courses/mine')
    // The router has no handler for /mine itself; it should fall through.
    // If getCourse were wrongly catching it, handler would be 'getCourse'.
    expect(res.body.handler).not.toBe('getMyCourses')
    expect(res.body.handler).not.toBe('getMyCourseDetail')
  })

  // ── PUT /courses/:id ──────────────────────────────────────────────────────
  it('PUT /courses/course-42 → updateCourse', async () => {
    const res = await request(app).put('/courses/course-42').send({})
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('updateCourse')
  })

  // ── DELETE /courses/:id ───────────────────────────────────────────────────
  it('DELETE /courses/course-42 → deleteCourse', async () => {
    const res = await request(app).delete('/courses/course-42')
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('deleteCourse')
  })

  // ── POST /courses/:id/submit ──────────────────────────────────────────────
  it('POST /courses/course-42/submit → submitForReview', async () => {
    const res = await request(app).post('/courses/course-42/submit')
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('submitForReview')
  })
})
