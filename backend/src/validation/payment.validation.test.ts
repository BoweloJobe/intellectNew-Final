import { describe, expect, it } from 'vitest'
import { createOrderSchema } from './payment.validation.js'

describe('payment validation', () => {
  it('accepts returnUrl and cancelUrl within the trusted frontend origin', () => {
    const result = createOrderSchema.safeParse({
      returnUrl: 'http://localhost:5173/courses/course-1?payment=course',
      cancelUrl: 'http://localhost:5173/courses/course-1',
    })

    expect(result.success).toBe(true)
  })

  it('rejects returnUrl with an external origin', () => {
    const result = createOrderSchema.safeParse({
      returnUrl: 'https://evil.example.com/courses/course-1?payment=course',
      cancelUrl: 'http://localhost:5173/courses/course-1',
    })

    expect(result.success).toBe(false)
    expect(result.error?.errors[0]?.message).toContain('trusted frontend origin')
  })

  it('rejects invalid schemes such as javascript:', () => {
    const result = createOrderSchema.safeParse({
      returnUrl: 'javascript:alert(1)',
      cancelUrl: 'http://localhost:5173/courses/course-1',
    })

    expect(result.success).toBe(false)
  })

  it('allows missing returnUrl and cancelUrl when payment URLs are omitted', () => {
    const result = createOrderSchema.safeParse({})

    expect(result.success).toBe(true)
  })
})
