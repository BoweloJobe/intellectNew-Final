import type { Request, Response, NextFunction } from 'express'
import * as PaymentService from '../services/payment.service.js'
import { validate } from '../lib/validate.js'
import { captureOrderSchema } from '../validation/payment.validation.js'

// POST /api/payments/courses/:courseId/create-order
export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const { courseId } = req.params
    const result = await PaymentService.createOrder(userId, courseId)
    res.status(201).json({ data: result })
  } catch (err) {
    next(err)
  }
}

// POST /api/payments/courses/:courseId/capture
export async function captureAndEnroll(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const { courseId } = req.params
    const { orderId } = validate(captureOrderSchema, req.body)
    const result = await PaymentService.captureAndEnroll(userId, courseId, orderId)
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/payments
export async function getPayments(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query['page']) || 1
    const limit = Number(req.query['limit']) || 20
    const status = typeof req.query['status'] === 'string' ? req.query['status'] : undefined
    const result = await PaymentService.getAllPayments({ status, page, limit })
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}
