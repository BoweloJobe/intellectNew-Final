import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type NextFunction, type Request, type Response } from 'express'
import { AppError } from '../../errors/AppError.js'

const mockVerifyToken = vi.hoisted(() => vi.fn())

vi.mock('../../lib/token.js', () => ({
  verifyToken: mockVerifyToken,
}))

import { optionalAuth, requireAuth } from '../auth.middleware.js'

function makeApp() {
  const app = express()

  app.get('/public', optionalAuth, (req, res) => {
    res.json({ userId: req.user?.id ?? null })
  })

  app.get('/protected', requireAuth, (req, res) => {
    res.json({ userId: req.user?.id ?? null })
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

    const res = await request(makeApp())
      .get('/public')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(200)
    expect(res.body.userId).toBe('student-1')
    expect(mockVerifyToken).toHaveBeenCalledWith('valid-token')
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
  })
})
