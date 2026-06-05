import { z } from 'zod'

export const captureOrderSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
})

export type CaptureOrderInput = z.infer<typeof captureOrderSchema>
