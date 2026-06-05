import type { Request, Response, NextFunction } from 'express'
import * as SubscriptionService from '../services/subscription.service.js'
import { validate } from '../lib/validate.js'
import {
  createCheckoutSessionSchema,
  verifySubscriptionSchema,
  adminActivateSchema,
} from '../validation/subscription.validation.js'

// GET /api/subscriptions/me
export async function getMySubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await SubscriptionService.getMySubscription(req.user!.id)
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}

// POST /api/subscriptions/checkout
export async function createCheckoutSession(req: Request, res: Response, next: NextFunction) {
  try {
    const input = validate(createCheckoutSessionSchema, req.body)
    const result = await SubscriptionService.createCheckoutSession(req.user!.id, input)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

// POST /api/subscriptions/verify
export async function verifySubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { subscriptionId, providerSubscriptionId } = validate(verifySubscriptionSchema, req.body)
    const result = await SubscriptionService.verifySubscription(
      req.user!.id,
      subscriptionId,
      providerSubscriptionId,
    )
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}

// POST /api/subscriptions/cancel
export async function cancelSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    await SubscriptionService.cancelSubscription(req.user!.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/subscriptions
export async function listSubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query['page']) || 1
    const limit = Number(req.query['limit']) || 20
    const status = typeof req.query['status'] === 'string' ? req.query['status'] : undefined
    const result = await SubscriptionService.listSubscriptions({ status, page, limit })
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/subscriptions/:id/activate
export async function adminActivateSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { periodMonths, providerSubscriptionId } = validate(adminActivateSchema, req.body)
    const result = await SubscriptionService.activateSubscription(req.params['id']!, {
      periodMonths,
      providerSubscriptionId,
    })
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}
