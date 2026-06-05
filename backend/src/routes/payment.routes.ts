import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import * as PaymentController from '../controllers/payment.controller.js'

const router = Router()

// POST /api/payments/courses/:courseId/create-order
router.post('/courses/:courseId/create-order', requireAuth, PaymentController.createOrder)

// POST /api/payments/courses/:courseId/capture
router.post('/courses/:courseId/capture', requireAuth, PaymentController.captureAndEnroll)

export default router
