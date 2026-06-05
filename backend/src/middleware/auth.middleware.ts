import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/token.js'
import { AppError } from '../errors/AppError.js'

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'))
  }

  const token = header.slice(7)
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    next(new AppError(401, 'Invalid or expired token'))
  }
}
