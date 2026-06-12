import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/token.js'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'

async function loadCurrentUser(userId: string): Promise<Express.Request['user'] | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  })

  return user
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'))
  }

  const token = header.slice(7)
  let payload: ReturnType<typeof verifyToken>
  try {
    payload = verifyToken(token)
  } catch {
    return next(new AppError(401, 'Invalid or expired token'))
  }

  try {
    const user = await loadCurrentUser(payload.id)
    if (!user) {
      return next(new AppError(401, 'Authentication required'))
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next()
  }

  const token = header.slice(7)
  try {
    const payload = verifyToken(token)
    const user = await loadCurrentUser(payload.id)
    if (user) {
      req.user = user
    }
  } catch {
    // Public routes should keep browsing available when an optional token is stale.
  }
  next()
}
