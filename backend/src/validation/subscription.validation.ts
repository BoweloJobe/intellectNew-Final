import { z } from 'zod'

export const createCheckoutSessionSchema = z.object({
  billingCycle: z.enum(['monthly', 'annual']),
})

export const verifySubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'subscriptionId is required'),
  providerSubscriptionId: z.string().min(1, 'providerSubscriptionId is required'),
})

export const adminActivateSchema = z.object({
  periodMonths: z.number().int().min(1).max(12),
  providerSubscriptionId: z.string().min(1).optional(),
})

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>
export type VerifySubscriptionInput = z.infer<typeof verifySubscriptionSchema>
export type AdminActivateInput = z.infer<typeof adminActivateSchema>
