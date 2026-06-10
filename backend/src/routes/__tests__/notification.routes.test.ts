import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'

let mockUser = { id: 'user-1', email: 'user@example.com', role: 'STUDENT' }

vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }

    const userId = header.includes('other-token') ? 'user-2' : 'user-1'
    mockUser = { id: userId, email: `${userId}@example.com`, role: 'STUDENT' }
    ;(req as unknown as { user: typeof mockUser }).user = mockUser
    next()
  },
}))

const mockPrisma = vi.hoisted(() => ({
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  notificationPreference: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import notificationRouter from '../notification.routes.js'
import { errorHandler } from '../../middleware/error.middleware.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/notifications', notificationRouter)
  app.use(errorHandler)
  return app
}

const savedPreferences = {
  userId: 'user-1',
  courseUpdates: false,
  quizReminders: true,
  assignmentDeadlines: false,
  communityActivity: true,
  weeklyProgressReport: false,
  emailNotifications: true,
  createdAt: new Date('2026-06-01T10:00:00.000Z'),
  updatedAt: new Date('2026-06-01T10:00:00.000Z'),
}

const preferencePayload = {
  courseUpdates: false,
  quizReminders: true,
  assignmentDeadlines: false,
  communityActivity: true,
  weeklyProgressReport: false,
  emailNotifications: true,
}

describe('notification preference routes', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    mockUser = { id: 'user-1', email: 'user@example.com', role: 'STUDENT' }
    app = makeApp()
  })

  it('returns 401 for unauthenticated preference reads and writes', async () => {
    const readRes = await request(app).get('/notifications/preferences')
    const writeRes = await request(app).put('/notifications/preferences').send(preferencePayload)

    expect(readRes.status).toBe(401)
    expect(writeRes.status).toBe(401)
    expect(mockPrisma.notificationPreference.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.notificationPreference.upsert).not.toHaveBeenCalled()
  })

  it('returns default preferences when none are saved', async () => {
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(null)

    const res = await request(app).get('/notifications/preferences').set('Authorization', 'Bearer token')

    expect(res.status).toBe(200)
    expect(mockPrisma.notificationPreference.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    })
    expect(res.body.data.preferences).toEqual({
      courseUpdates: true,
      quizReminders: true,
      assignmentDeadlines: true,
      communityActivity: false,
      weeklyProgressReport: true,
      emailNotifications: true,
    })
  })

  it('saves preferences for the authenticated user', async () => {
    mockPrisma.notificationPreference.upsert.mockResolvedValue(savedPreferences)

    const res = await request(app)
      .put('/notifications/preferences')
      .set('Authorization', 'Bearer token')
      .send(preferencePayload)

    expect(res.status).toBe(200)
    expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', ...preferencePayload },
      update: preferencePayload,
    })
    expect(res.body.data.preferences).toEqual(preferencePayload)
  })

  it('loads saved preferences for the authenticated user', async () => {
    mockPrisma.notificationPreference.findUnique.mockResolvedValue(savedPreferences)

    const res = await request(app).get('/notifications/preferences').set('Authorization', 'Bearer token')

    expect(res.status).toBe(200)
    expect(res.body.data.preferences).toEqual(preferencePayload)
  })

  it('does not let one user affect another user preferences', async () => {
    mockPrisma.notificationPreference.upsert.mockResolvedValue({
      ...savedPreferences,
      userId: 'user-2',
    })

    const res = await request(app)
      .put('/notifications/preferences')
      .set('Authorization', 'Bearer other-token')
      .send(preferencePayload)

    expect(res.status).toBe(200)
    expect(mockPrisma.notificationPreference.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-2' },
      create: { userId: 'user-2', ...preferencePayload },
      update: preferencePayload,
    })
  })

  it('rejects invalid preference payloads', async () => {
    const res = await request(app)
      .put('/notifications/preferences')
      .set('Authorization', 'Bearer token')
      .send({
        ...preferencePayload,
        courseUpdates: 'yes',
      })

    expect(res.status).toBe(400)
    expect(mockPrisma.notificationPreference.upsert).not.toHaveBeenCalled()
  })
})
