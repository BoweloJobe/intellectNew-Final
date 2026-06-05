/**
 * Route-dispatch tests for admin.routes.ts
 *
 * Verifies that the admin course queue endpoint (GET /admin/courses/queue) is
 * never swallowed by the dynamic /:id routes (POST /courses/:id/approve|reject).
 * Both are different HTTP methods so there is no real Express conflict here,
 * but this test documents and locks in the expected dispatch behaviour.
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
vi.mock('../../controllers/admin.controller.js', () => ({
  getQueue: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'getQueue' }),
  ),
  approveCourse: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'approveCourse', id: (_req as any).params.id }),
  ),
  rejectCourse: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'rejectCourse', id: (_req as any).params.id }),
  ),
}))

vi.mock('../../controllers/payment.controller.js', () => ({
  getPayments: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'getPayments' }),
  ),
  createOrder: vi.fn((_req: Request, res: Response) =>
    res.status(201).json({ handler: 'createOrder' }),
  ),
  captureAndEnroll: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'captureAndEnroll' }),
  ),
}))

vi.mock('../../controllers/subscription.controller.js', () => ({
  listSubscriptions: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'listSubscriptions' }),
  ),
  adminActivateSubscription: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'adminActivateSubscription' }),
  ),
  getMySubscription: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'getMySubscription' }),
  ),
  createCheckoutSession: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'createCheckoutSession' }),
  ),
  verifySubscription: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'verifySubscription' }),
  ),
  cancelSubscription: vi.fn((_req: Request, res: Response) =>
    res.json({ handler: 'cancelSubscription' }),
  ),
}))

import adminRouter from '../admin.routes.js'

// ── Test suite ──────────────────────────────────────────────────────────────
describe('admin routes – handler dispatch order', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/admin', adminRouter)
  })

  // ── GET /admin/courses/queue ──────────────────────────────────────────────
  it('GET /admin/courses/queue → getQueue (not caught by /:id/approve|reject)', async () => {
    const res = await request(app).get('/admin/courses/queue')
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('getQueue')
  })

  // ── POST /admin/courses/:id/approve ──────────────────────────────────────
  it('POST /admin/courses/course-7/approve → approveCourse', async () => {
    const res = await request(app).post('/admin/courses/course-7/approve')
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('approveCourse')
    expect(res.body.id).toBe('course-7')
  })

  // ── POST /admin/courses/:id/reject ────────────────────────────────────────
  it('POST /admin/courses/course-7/reject → rejectCourse', async () => {
    const res = await request(app).post('/admin/courses/course-7/reject')
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('rejectCourse')
    expect(res.body.id).toBe('course-7')
  })

  // ── GET /admin/payments ───────────────────────────────────────────────────
  it('GET /admin/payments → getPayments', async () => {
    const res = await request(app).get('/admin/payments')
    expect(res.status).toBe(200)
    expect(res.body.handler).toBe('getPayments')
  })
})
