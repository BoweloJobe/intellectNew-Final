import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'
import { AppError } from '../../errors/AppError.js'

const mockVerifyToken = vi.hoisted(() => vi.fn())
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}))

vi.mock('../../lib/token.js', () => ({
  verifyToken: mockVerifyToken,
}))
vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))

import { optionalAuth, requireAuth } from '../auth.middleware.js'
import { requireRole } from '../role.middleware.js'

function makeApp() {
  const app = express()

  app.get('/public', optionalAuth, (req, res) => {
    res.json({ role: req.user?.role ?? null, userId: req.user?.id ?? null })
  })

  app.get('/protected', requireAuth, (req, res) => {
    res.json({ role: req.user?.role ?? null, userId: req.user?.id ?? null })
  })

  app.get('/admin', requireAuth, requireRole('ADMIN'), (req, res) => {
    res.json({ role: req.user?.role ?? null, userId: req.user?.id ?? null })
  })

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message })
    }
    res.status(500).json({ message: err.message })
  })

  return app
}

describe('auth middleware', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset()
    mockPrisma.user.findUnique.mockReset()
  })

  it('lets optional auth public routes through anonymously when no token is provided', async () => {
    const res = await request(makeApp()).get('/public')

    expect(res.status).toBe(200)
    expect(res.body.userId).toBeNull()
    expect(mockVerifyToken).not.toHaveBeenCalled()
  })

  it('attaches the user on optional auth public routes when a bearer token is valid', async () => {
    mockVerifyToken.mockReturnValue({
      id: 'student-1',
      email: 'student@example.com',
      role: 'STUDENT',
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'student-1',
      email: 'student@example.com',
      role: 'STUDENT',
    })

    const res = await request(makeApp())
      .get('/public')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('student-1')
    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token')
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'student-1' },
      select: { id: true, email: true, role: true },
    })
  })

  it('keeps optional auth public routes anonymous when a valid token user no longer exists', async () => {
    mockVerifyToken.mockReturnValue({
      id: 'missing-user',
      email: 'missing@example.com',
      role: 'STUDENT',
    })
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const res = await request(makeApp())
      .get('/public')
      .set('Authorization', 'Bearer valid-token-for-deleted-user')

    expect(res.status).toBe(200)
    expect(res.body.userId).toBeNull()
  })

  it('treats invalid optional auth tokens as anonymous public browsing', async () => {
    mockVerifyToken.mockImplementation(() => {
      throw new Error('expired')
    })

    const res = await request(makeApp())
      .get('/public')
      .set('Authorization', 'Bearer expired-token')

    expect(res.status).toBe(200)
    expect(res.body.userId).toBeNull()
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('keeps protected routes strict when no token is provided', async () => {
    const res = await request(makeApp()).get('/protected')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Authentication required')
    expect(mockVerifyToken).not.toHaveBeenCalled()
  })

  it('keeps protected routes strict when a bearer token is invalid', async () => {
    mockVerifyToken.mockImplementation(() => {
      throw new Error('expired')
    })

    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer expired-token')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid or expired token')
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('allows a normal authenticated route using the current database user', async () => {
    mockVerifyToken.mockReturnValue({
      id: 'student-1',
      email: 'old-email@example.com',
      role: 'ADMIN',
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'student-1',
      email: 'student@example.com',
      role: 'STUDENT',
    })

    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer stale-admin-token')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ role: 'STUDENT', userId: 'student-1' })
  })

  it('rejects protected routes when the token user no longer exists in the database', async () => {
    mockVerifyToken.mockReturnValue({
      id: 'deleted-user',
      email: 'deleted@example.com',
      role: 'STUDENT',
    })
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer valid-token-for-deleted-user')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Authentication required')
  })

  it('uses the current database role so stale admin tokens lose admin access immediately', async () => {
    mockVerifyToken.mockReturnValue({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'admin@example.com',
      role: 'STUDENT',
    })

    const res = await request(makeApp())
      .get('/admin')
      .set('Authorization', 'Bearer stale-admin-token')

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Insufficient permissions')
  })
})
