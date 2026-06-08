import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  payment: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  enrollment: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  course: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const mockCaptureOrder = vi.hoisted(() => vi.fn())
const mockCreateOrder = vi.hoisted(() => vi.fn())
const mockFireNotification = vi.hoisted(() => vi.fn())

vi.mock('../../lib/prisma.js', () => ({ prisma: mockPrisma }))
vi.mock('../../lib/paypal.js', () => ({
  createOrder: mockCreateOrder,
  captureOrder: mockCaptureOrder,
}))
vi.mock('../notification.service.js', () => ({
  fireNotification: mockFireNotification,
}))

import { captureAndEnroll, createOrder } from '../payment.service.js'

function pendingPayment(overrides = {}) {
  return {
    id: 'payment-1',
    userId: 'user-1',
    courseId: 'course-1',
    amount: 49.99,
    currency: 'USD',
    providerId: 'order-1',
    status: 'PENDING',
    ...overrides,
  }
}

function completedCapture(overrides = {}) {
  return {
    id: 'order-1',
    status: 'COMPLETED',
    purchase_units: [
      {
        reference_id: 'course-1',
        payments: {
          captures: [
            {
              id: 'capture-1',
              status: 'COMPLETED',
              amount: { currency_code: 'USD', value: '49.99' },
            },
          ],
        },
      },
    ],
    ...overrides,
  }
}

describe('payment capture service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops))
    mockPrisma.course.findUnique.mockResolvedValue({ title: 'Paid Course' })
  })

  it('creates a PayPal order with return URLs and exposes the approval URL', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      title: 'Paid Course',
      price: 49.99,
    })
    mockPrisma.enrollment.findUnique.mockResolvedValue(null)
    mockPrisma.payment.findFirst.mockResolvedValue(null)
    mockCreateOrder.mockResolvedValue({
      id: 'order-1',
      status: 'CREATED',
      links: [
        { rel: 'approve', href: 'https://paypal.example.test/approve?token=order-1', method: 'GET' },
      ],
    })
    mockPrisma.payment.create.mockResolvedValue({})

    const result = await createOrder('user-1', 'course-1', {
      returnUrl: 'https://app.example.test/courses/course-1?payment=course',
      cancelUrl: 'https://app.example.test/courses/course-1',
    })

    expect(mockCreateOrder).toHaveBeenCalledWith({
      courseId: 'course-1',
      amount: '49.99',
      description: 'Enrollment: Paid Course',
      returnUrl: 'https://app.example.test/courses/course-1?payment=course',
      cancelUrl: 'https://app.example.test/courses/course-1',
    })
    expect(result).toEqual({
      orderId: 'order-1',
      amount: '49.99',
      approvalUrl: 'https://paypal.example.test/approve?token=order-1',
    })
  })

  it('completes payment and enrolls when PayPal amount and currency match the pending payment', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(pendingPayment())
    mockCaptureOrder.mockResolvedValue(completedCapture())
    mockPrisma.payment.update.mockResolvedValue({ id: 'payment-1', status: 'COMPLETED' })
    mockPrisma.enrollment.create.mockResolvedValue({
      id: 'enrollment-1',
      courseId: 'course-1',
      enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const result = await captureAndEnroll('user-1', 'course-1', 'order-1')

    expect(mockCaptureOrder).toHaveBeenCalledWith('order-1')
    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: 'COMPLETED', capturedAt: expect.any(Date) },
    })
    expect(mockPrisma.enrollment.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', courseId: 'course-1', paymentId: 'payment-1' },
      select: { id: true, courseId: true, enrolledAt: true },
    })
    expect(result.payment).toEqual({ id: 'payment-1', status: 'COMPLETED' })
  })

  it('rejects capture when PayPal amount does not match the pending payment', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(pendingPayment())
    mockCaptureOrder.mockResolvedValue(
      completedCapture({
        purchase_units: [
          {
            reference_id: 'course-1',
            payments: {
              captures: [
                {
                  id: 'capture-1',
                  status: 'COMPLETED',
                  amount: { currency_code: 'USD', value: '1.00' },
                },
              ],
            },
          },
        ],
      }),
    )
    mockPrisma.payment.update.mockResolvedValue({ id: 'payment-1', status: 'FAILED' })

    await expect(captureAndEnroll('user-1', 'course-1', 'order-1')).rejects.toMatchObject({
      statusCode: 400,
      message: 'PayPal capture amount does not match payment',
    })
    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: 'FAILED' },
    })
    expect(mockPrisma.enrollment.create).not.toHaveBeenCalled()
  })

  it('rejects capture when PayPal currency does not match the pending payment', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(pendingPayment())
    mockCaptureOrder.mockResolvedValue(
      completedCapture({
        purchase_units: [
          {
            reference_id: 'course-1',
            payments: {
              captures: [
                {
                  id: 'capture-1',
                  status: 'COMPLETED',
                  amount: { currency_code: 'EUR', value: '49.99' },
                },
              ],
            },
          },
        ],
      }),
    )
    mockPrisma.payment.update.mockResolvedValue({ id: 'payment-1', status: 'FAILED' })

    await expect(captureAndEnroll('user-1', 'course-1', 'order-1')).rejects.toMatchObject({
      statusCode: 400,
      message: 'PayPal capture currency does not match payment',
    })
    expect(mockPrisma.enrollment.create).not.toHaveBeenCalled()
  })

  it('rejects non-completed PayPal order status before enrollment', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(pendingPayment())
    mockCaptureOrder.mockResolvedValue(completedCapture({ status: 'PAYER_ACTION_REQUIRED' }))
    mockPrisma.payment.update.mockResolvedValue({ id: 'payment-1', status: 'FAILED' })

    await expect(captureAndEnroll('user-1', 'course-1', 'order-1')).rejects.toMatchObject({
      statusCode: 402,
      message: 'PayPal capture status: PAYER_ACTION_REQUIRED',
    })
    expect(mockPrisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: 'FAILED' },
    })
    expect(mockPrisma.enrollment.create).not.toHaveBeenCalled()
  })

  it('returns existing enrollment without recapturing when local payment is already completed', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(pendingPayment({ status: 'COMPLETED' }))
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      courseId: 'course-1',
      enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    const result = await captureAndEnroll('user-1', 'course-1', 'order-1')

    expect(mockCaptureOrder).not.toHaveBeenCalled()
    expect(mockPrisma.enrollment.create).not.toHaveBeenCalled()
    expect(result).toEqual({
      enrollment: {
        id: 'enrollment-1',
        courseId: 'course-1',
        enrolledAt: expect.any(Date),
      },
      alreadyCaptured: true,
    })
  })
})
