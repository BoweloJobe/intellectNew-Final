import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'
import { AppError } from '../../errors/AppError.js'
import { errorHandler } from '../../middleware/error.middleware.js'

let mockUser = { id: 'admin-1', role: 'ADMIN' }

vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    ;(req as unknown as { user: { id: string; role: string } }).user = mockUser
    next()
  },
}))

vi.mock('../../middleware/role.middleware.js', () => ({
  requireRole:
    (...roles: string[]) =>
    (req: Request, _res: Response, next: NextFunction) => {
      const user = (req as unknown as { user?: { id: string; role: string } }).user
      if (!user) {
        next(new AppError(401, 'Authentication required'))
        return
      }
      if (!roles.includes(user.role)) {
        next(new AppError(403, 'Insufficient permissions'))
        return
      }
      next()
    },
}))

const mockAdminService = vi.hoisted(() => ({
  listUsers: vi.fn(),
  updateUserRole: vi.fn(),
}))

vi.mock('../../services/admin.service.js', () => mockAdminService)
vi.mock('../../services/course.service.js', () => ({
  getPendingCourses: vi.fn(),
  approveCourse: vi.fn(),
  rejectCourse: vi.fn(),
}))
vi.mock('../../controllers/payment.controller.js', () => ({
  getPayments: vi.fn((_req: Request, res: Response) => res.json({ status: 'ok', data: { payments: [] } })),
}))
vi.mock('../../controllers/subscription.controller.js', () => ({
  listSubscriptions: vi.fn((_req: Request, res: Response) => res.json({ status: 'ok', data: { subscriptions: [] } })),
  adminActivateSubscription: vi.fn((_req: Request, res: Response) => res.json({ status: 'ok' })),
}))

import adminRouter from '../admin.routes.js'

function createApp(): express.Express {
  const app = express()
  app.use(express.json())
  app.use('/admin', adminRouter)
  app.use(errorHandler)
  return app
}

const safeUser = {
  id: 'user-1',
  email: 'student@example.com',
  firstName: 'Sarah',
  lastName: 'Student',
  role: 'STUDENT',
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
}

describe('admin user management routes', () => {
  let app: express.Express

  beforeEach(() => {
    vi.clearAllMocks()
    mockUser = { id: 'admin-1', role: 'ADMIN' }
    app = createApp()
  })

  it('allows admins to list users', async () => {
    mockAdminService.listUsers.mockResolvedValue([safeUser])

    const res = await request(app).get('/admin/users')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', data: { users: [safeUser] } })
    expect(JSON.stringify(res.body)).not.toContain('passwordHash')
  })

  it('allows admins to update a user role', async () => {
    mockAdminService.updateUserRole.mockResolvedValue({ ...safeUser, role: 'INSTRUCTOR' })

    const res = await request(app)
      .patch('/admin/users/user-1/role')
      .send({ role: 'INSTRUCTOR' })

    expect(res.status).toBe(200)
    expect(mockAdminService.updateUserRole).toHaveBeenCalledWith('admin-1', 'user-1', 'INSTRUCTOR')
    expect(res.body.data.user.role).toBe('INSTRUCTOR')
    expect(JSON.stringify(res.body)).not.toContain('passwordHash')
  })

  it('blocks non-admin users from updating roles', async () => {
    mockUser = { id: 'student-1', role: 'STUDENT' }

    const res = await request(app)
      .patch('/admin/users/user-1/role')
      .send({ role: 'INSTRUCTOR' })

    expect(res.status).toBe(403)
    expect(mockAdminService.updateUserRole).not.toHaveBeenCalled()
  })

  it('rejects invalid roles', async () => {
    const res = await request(app)
      .patch('/admin/users/user-1/role')
      .send({ role: 'OWNER' })

    expect(res.status).toBe(400)
    expect(mockAdminService.updateUserRole).not.toHaveBeenCalled()
  })

  it('returns self-demotion protection failures from the service', async () => {
    mockAdminService.updateUserRole.mockRejectedValue(
      new AppError(409, 'You cannot remove your own admin access'),
    )

    const res = await request(app)
      .patch('/admin/users/admin-1/role')
      .send({ role: 'STUDENT' })

    expect(res.status).toBe(409)
    expect(res.body.message).toBe('You cannot remove your own admin access')
  })
})
