import { z } from 'zod'
import { env } from '../config/env.js'

const trustedFrontendOrigin = new URL(env.FRONTEND_URL).origin

const appOwnedRedirectUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value)
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.origin === trustedFrontendOrigin
      )
    } catch {
      return false
    }
  }, {
    message: `URL must be an absolute http(s) URL within the trusted frontend origin: ${trustedFrontendOrigin}`,
  })

export const createOrderSchema = z.object({
  returnUrl: appOwnedRedirectUrl.optional(),
  cancelUrl: appOwnedRedirectUrl.optional(),
})

export const captureOrderSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type CaptureOrderInput = z.infer<typeof captureOrderSchema>
