import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'

let mockUser = { id: 'user-1', email: 'student@example.com', role: 'STUDENT' }

vi.mock('../../middleware/auth.middleware.js', () => ({
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ status: 'error', message: 'Authentication required' })
      return
    }
    ;(req as unknown as { user: typeof mockUser }).user = mockUser
    next()
  },
}))

const mockAuthService = vi.hoisted(() => ({
  signup: vi.fn(),
  login: vi.fn(),
  getMe: vi.fn(),
  updateProfile: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('../../services/auth.service.js', () => mockAuthService)

import authRouter from '../auth.routes.js'
import { errorHandler } from '../../middleware/error.middleware.js'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use('/auth', authRouter)
  app.use(errorHandler)
  return app
}

const userProfile = {
  id: 'user-1',
  email: 'student@example.com',
  firstName: 'Sarah',
  lastName: 'Johnson',
  role: 'STUDENT',
  avatarUrl: null,
  bio: 'Biology student',
  institution: 'Example University',
  isVerified: true,
  createdAt: new Date('2026-06-01T10:00:00.000Z'),
}

describe('auth routes', () => {
  let app: express.Express

  beforeEach(() => {
    vi.resetAllMocks()
    mockUser = { id: 'user-1', email: 'student@example.com', role: 'STUDENT' }
    app = makeApp()
  })

  it('requires auth for profile update', async () => {
    const res = await request(app).patch('/auth/me').send({
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'student@example.com',
    })

    expect(res.status).toBe(401)
    expect(mockAuthService.updateProfile).not.toHaveBeenCalled()
  })

  it('updates only allowed profile fields for the authenticated user', async () => {
    mockAuthService.updateProfile.mockResolvedValue(userProfile)

    const res = await request(app)
      .patch('/auth/me')
      .set('Authorization', 'Bearer token')
      .send({
        firstName: ' Sarah ',
        lastName: ' Johnson ',
        email: 'student@example.com',
        bio: ' Biology student ',
        institution: ' Example University ',
        role: 'ADMIN',
        password: 'new-password',
        isVerified: false,
        subscriptionTier: 'pro',
      })

    expect(res.status).toBe(200)
    expect(mockAuthService.updateProfile).toHaveBeenCalledWith('user-1', {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'student@example.com',
      bio: 'Biology student',
      institution: 'Example University',
    })
    expect(res.body.data.user.bio).toBe('Biology student')
    expect(res.body.data.user.institution).toBe('Example University')
  })

  it('returns profile fields from /me', async () => {
    mockAuthService.getMe.mockResolvedValue(userProfile)

    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer token')

    expect(res.status).toBe(200)
    expect(mockAuthService.getMe).toHaveBeenCalledWith('user-1')
    expect(res.body.data.user).toEqual(expect.objectContaining({
      bio: 'Biology student',
      institution: 'Example University',
    }))
  })

  it('accepts simplified signup payload with role', async () => {
    mockAuthService.signup.mockResolvedValue({ token: 'token', user: userProfile })

    const res = await request(app).post('/auth/signup').send({
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'student@example.com',
      password: 'password123',
      role: 'INSTRUCTOR',
    })

    expect(res.status).toBe(201)
    expect(mockAuthService.signup).toHaveBeenCalledWith({
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'student@example.com',
      password: 'password123',
      role: 'INSTRUCTOR',
    })
  })
})
