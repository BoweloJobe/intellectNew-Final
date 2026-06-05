import type { Request, Response, NextFunction } from 'express'
import { getMySubscription } from '../services/subscription.service.js'
import { AppError } from '../errors/AppError.js'

/**
 * Middleware that gates a route behind an active premium subscription.
 * The backend is the sole source of truth — no frontend claim is trusted.
 */
export async function requirePremium(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sub = await getMySubscription(req.user!.id)
    if (!sub.isPremium) {
      return next(new AppError(403, 'An active premium subscription is required to access this content'))
    }
    next()
  } catch (err) {
    next(err)
  }
}
