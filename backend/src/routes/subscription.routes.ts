import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as SubscriptionController from '../controllers/subscription.controller.js'

const router = Router()

// GET  /api/subscriptions/me
router.get('/me', requireAuth, SubscriptionController.getMySubscription)

// POST /api/subscriptions/checkout
router.post('/checkout', requireAuth, SubscriptionController.createCheckoutSession)

// POST /api/subscriptions/verify
router.post('/verify', requireAuth, SubscriptionController.verifySubscription)

// POST /api/subscriptions/cancel
router.post('/cancel', requireAuth, SubscriptionController.cancelSubscription)

export default router
