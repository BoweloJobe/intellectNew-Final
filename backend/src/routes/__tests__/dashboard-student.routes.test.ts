import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'

vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
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

const mockDashboardService = vi.hoisted(() => ({
  getStudentDashboard: vi.fn(),
  getInstructorDashboard: vi.fn(),
  getAdminDashboard: vi.fn(),
}))

vi.mock('../../services/dashboard.service.js', () => mockDashboardService)

import dashboardRouter from '../dashboard.routes.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/dashboard', dashboardRouter)
  return app
}

describe('GET /dashboard/student', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    app = makeApp()
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/dashboard/student')

    expect(res.status).toBe(401)
    expect(mockDashboardService.getStudentDashboard).not.toHaveBeenCalled()
  })

  it('loads dashboard for the authenticated user only', async () => {
    mockDashboardService.getStudentDashboard.mockResolvedValue({
      stats: [],
      continueLearning: [],
      upcomingQuizzes: [],
      recommendations: [],
    })

    const res = await request(app)
      .get('/dashboard/student')
      .set('Authorization', 'Bearer token')

    expect(res.status).toBe(200)
    expect(mockDashboardService.getStudentDashboard).toHaveBeenCalledWith('student-1')
    expect(res.body.data).toEqual({
      stats: [],
      continueLearning: [],
      upcomingQuizzes: [],
      recommendations: [],
    })
  })
})
