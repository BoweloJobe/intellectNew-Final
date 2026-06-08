import { prisma } from '../lib/prisma.js'
import * as PayPalClient from '../lib/paypal.js'
import { AppError } from '../errors/AppError.js'
import { fireNotification } from './notification.service.js'

const COMPLETED_PAYMENT_STATUS = 'COMPLETED'

function toMinorUnits(amount: number | string): number {
  const value = typeof amount === 'number' ? amount.toFixed(2) : amount
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value)
  if (!match) throw new AppError(400, 'Invalid payment amount')

  const major = Number.parseInt(match[1], 10)
  const minor = Number.parseInt((match[2] ?? '').padEnd(2, '0'), 10)
  return major * 100 + minor
}

function assertProviderCaptureMatchesPayment(params: {
  capture: Awaited<ReturnType<typeof PayPalClient.captureOrder>>
  orderId: string
  courseId: string
  expectedAmount: number
  expectedCurrency: string
}): void {
  const { capture, orderId, courseId, expectedAmount, expectedCurrency } = params
  if (capture.status !== COMPLETED_PAYMENT_STATUS) {
    throw new AppError(402, `PayPal capture status: ${capture.status}`)
  }
  if (capture.id !== orderId) {
    throw new AppError(400, 'PayPal capture does not match payment order')
  }

  const purchaseUnit = capture.purchase_units?.[0]
  if (purchaseUnit?.reference_id && purchaseUnit.reference_id !== courseId) {
    throw new AppError(400, 'PayPal capture does not match course')
  }

  const providerCapture = purchaseUnit?.payments?.captures?.[0]
  if (!providerCapture) {
    throw new AppError(400, 'PayPal capture is missing capture details')
  }
  if (providerCapture.status && providerCapture.status !== COMPLETED_PAYMENT_STATUS) {
    throw new AppError(402, `PayPal capture status: ${providerCapture.status}`)
  }
  if (toMinorUnits(providerCapture.amount.value) !== toMinorUnits(expectedAmount)) {
    throw new AppError(400, 'PayPal capture amount does not match payment')
  }
  if (providerCapture.amount.currency_code !== expectedCurrency) {
    throw new AppError(400, 'PayPal capture currency does not match payment')
  }
}

// ─── Create PayPal order (step 1) ─────────────────────────────────────────────

export async function createOrder(userId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, status: 'APPROVED' },
    select: { id: true, title: true, price: true },
  })
  if (!course) throw new AppError(404, 'Course not found')
  if (!course.price || course.price <= 0) {
    throw new AppError(400, 'This course is free — enroll directly')
  }

  // Guard: already enrolled
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (enrolled) throw new AppError(409, 'Already enrolled in this course')

  // Guard: existing pending payment (idempotency)
  const pending = await prisma.payment.findFirst({
    where: { userId, courseId, status: 'PENDING' },
  })
  if (pending) {
    return { orderId: pending.providerId, amount: pending.amount.toString() }
  }

  const amount = course.price.toFixed(2)
  const paypalOrder = await PayPalClient.createOrder({
    courseId: course.id,
    amount,
    description: `Enrollment: ${course.title}`,
  })

  await prisma.payment.create({
    data: {
      userId,
      courseId,
      amount: parseFloat(amount),
      provider: 'paypal',
      providerId: paypalOrder.id,
      status: 'PENDING',
    },
  })

  return { orderId: paypalOrder.id, amount }
}

// ─── Capture PayPal order (step 2) + auto-enroll ─────────────────────────────

export async function captureAndEnroll(userId: string, courseId: string, orderId: string) {
  const payment = await prisma.payment.findUnique({
    where: { providerId: orderId },
    select: {
      id: true,
      userId: true,
      courseId: true,
      amount: true,
      currency: true,
      providerId: true,
      status: true,
    },
  })

  if (!payment) throw new AppError(404, 'Payment order not found')
  if (payment.userId !== userId) throw new AppError(403, 'Access denied')
  if (payment.courseId !== courseId) throw new AppError(400, 'Order does not match course')
  if (payment.status === COMPLETED_PAYMENT_STATUS) {
    // Idempotent — return existing enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { paymentId: payment.id },
      select: { id: true, courseId: true, enrolledAt: true },
    })
    return { enrollment, alreadyCaptured: true }
  }
  if (payment.status !== 'PENDING') {
    throw new AppError(409, `Payment is in status: ${payment.status}`)
  }

  // Capture with PayPal
  const capture = await PayPalClient.captureOrder(orderId)
  try {
    assertProviderCaptureMatchesPayment({
      capture,
      orderId: payment.providerId,
      courseId: payment.courseId,
      expectedAmount: payment.amount,
      expectedCurrency: payment.currency,
    })
  } catch (err) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    })
    throw err
  }

  // Mark payment completed and create enrollment atomically
  // PayPal returns a nested capture id, but the current schema only has providerId
  // for the order id; persist capture ids when a dedicated field is added.
  const [updatedPayment, enrollment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: COMPLETED_PAYMENT_STATUS, capturedAt: new Date() },
    }),
    prisma.enrollment.create({
      data: { userId, courseId, paymentId: payment.id },
      select: { id: true, courseId: true, enrolledAt: true },
    }),
  ])

  // Fetch course title for notification
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true },
  })
  fireNotification(
    userId,
    'ENROLLMENT_CONFIRMED',
    'Enrollment confirmed',
    `Your payment was successful. You are now enrolled in "${course?.title ?? courseId}".`,
    { courseId, paymentId: updatedPayment.id },
  )

  return { enrollment, payment: { id: updatedPayment.id, status: updatedPayment.status } }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAllPayments(params: {
  status?: string
  page?: number
  limit?: number
}) {
  const page = params.page ?? 1
  const limit = Math.min(params.limit ?? 20, 100)
  const skip = (page - 1) * limit

  return prisma.payment.findMany({
    where: params.status ? { status: params.status as never } : undefined,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      provider: true,
      providerId: true,
      capturedAt: true,
      createdAt: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      course: { select: { id: true, title: true } },
    },
  })
}
