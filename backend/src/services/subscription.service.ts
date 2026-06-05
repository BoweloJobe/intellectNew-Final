import type { Subscription } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AppError } from '../errors/AppError.js'
import { fireNotification } from './notification.service.js'
import { env } from '../config/env.js'

import type { CreateCheckoutSessionInput } from '../validation/subscription.validation.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubscriptionState {
  status: 'free' | 'pending' | 'verification_pending' | 'active' | 'expired' | 'canceled'
  tier: 'free' | 'premium'
  isPremium: boolean
  billingCycle: 'monthly' | 'annual' | null
  currentPeriodEnd: Date | null
  provider: string | null
  subscriptionId: string | null
}

export interface CheckoutSessionResult {
  subscriptionId: string
  status: 'pending'
  provider: 'paypal' | null
  checkoutUrl: string | null      // populated when PayPal plan IDs are configured
  providerPlanId: string | null
  billingCycle: 'monthly' | 'annual'
  tier: 'premium'
  pricing: { amount: string; currency: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the current active/pending subscription for a user.
 * Returns null if the user is on the free tier (no relevant record).
 */
async function getCurrentSubscription(userId: string): Promise<Subscription | null> {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'PENDING', 'VERIFICATION_PENDING'] },
    },
    orderBy: { createdAt: 'desc' },
  })
}

function toSubscriptionState(sub: Subscription | null): SubscriptionState {
  if (!sub) {
    return {
      status: 'free',
      tier: 'free',
      isPremium: false,
      billingCycle: null,
      currentPeriodEnd: null,
      provider: null,
      subscriptionId: null,
    }
  }

  const now = new Date()
  const inActivePeriod =
    sub.status === 'ACTIVE' &&
    sub.currentPeriodEnd !== null &&
    sub.currentPeriodEnd > now

  const statusMap: Record<string, SubscriptionState['status']> = {
    PENDING: 'pending',
    VERIFICATION_PENDING: 'verification_pending',
    ACTIVE: inActivePeriod ? 'active' : 'expired',
    EXPIRED: 'expired',
    CANCELED: 'canceled',
  }

  return {
    status: statusMap[sub.status] ?? 'free',
    tier: 'premium',
    isPremium: inActivePeriod,
    billingCycle: sub.billingCycle === 'MONTHLY' ? 'monthly' : sub.billingCycle === 'ANNUAL' ? 'annual' : null,
    currentPeriodEnd: sub.currentPeriodEnd,
    provider: sub.provider,
    subscriptionId: sub.id,
  }
}

async function logEvent(
  subscriptionId: string,
  event: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.subscriptionEvent.create({
    data: { subscriptionId, event, metadata: metadata !== undefined ? JSON.stringify(metadata) : undefined },
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the caller's current subscription state.
 * Always returns a shape — free tier when no subscription exists.
 */
export async function getMySubscription(userId: string): Promise<SubscriptionState> {
  const sub = await getCurrentSubscription(userId)

  // Auto-expire: if ACTIVE but period has elapsed, persist the transition
  if (sub && sub.status === 'ACTIVE' && sub.currentPeriodEnd && sub.currentPeriodEnd <= new Date()) {
    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED', updatedAt: new Date() },
      }),
      prisma.subscriptionEvent.create({
        data: { subscriptionId: sub.id, event: 'expired' },
      }),
    ])
    fireNotification(
      userId,
      'SUBSCRIPTION_EXPIRED',
      'Subscription expired',
      'Your premium subscription has expired. Renew to keep access.',
      { subscriptionId: sub.id },
    )
    return toSubscriptionState(null)
  }

  return toSubscriptionState(sub)
}

/**
 * Create a checkout session (PENDING subscription record).
 * The checkoutUrl is null until a PayPal billing plan is configured in env.
 * State: none → PENDING
 */
export async function createCheckoutSession(
  userId: string,
  input: CreateCheckoutSessionInput,
): Promise<CheckoutSessionResult> {
  // Guard: already active
  const existing = await getCurrentSubscription(userId)
  if (existing?.status === 'ACTIVE') {
    throw new AppError(409, 'You already have an active subscription')
  }

  // Cancel any stale PENDING sessions so providerSubscriptionId unique index stays clean
  if (existing?.status === 'PENDING' || existing?.status === 'VERIFICATION_PENDING') {
    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'CANCELED', canceledAt: new Date() },
      }),
      prisma.subscriptionEvent.create({
        data: { subscriptionId: existing.id, event: 'superseded', metadata: JSON.stringify({ reason: 'new_checkout' }) },
      }),
    ])
  }

  const billingCycle = input.billingCycle === 'annual' ? 'ANNUAL' : 'MONTHLY'
  const planId = billingCycle === 'ANNUAL'
    ? env.PAYPAL_PLAN_ID_ANNUAL
    : env.PAYPAL_PLAN_ID_MONTHLY
  const amount = billingCycle === 'ANNUAL'
    ? env.SUBSCRIPTION_ANNUAL_PRICE
    : env.SUBSCRIPTION_MONTHLY_PRICE

  const sub = await prisma.subscription.create({
    data: {
      userId,
      tier: 'PREMIUM',
      status: 'PENDING',
      billingCycle,
      provider: 'paypal',
      providerPlanId: planId ?? null,
    },
  })

  await logEvent(sub.id, 'created', { billingCycle: input.billingCycle, tier: 'premium' })

  // checkoutUrl is built by the PayPal subscriptions API once plan IDs are configured.
  // When PAYPAL_PLAN_ID_* env vars are set, this can call PayPalClient.createSubscription(planId)
  // and return the approval_url from the response links array.
  const checkoutUrl: string | null = null

  return {
    subscriptionId: sub.id,
    status: 'pending',
    provider: 'paypal',
    checkoutUrl,
    providerPlanId: planId ?? null,
    billingCycle: input.billingCycle,
    tier: 'premium',
    pricing: {
      amount,
      currency: 'USD',
    },
  }
}

/**
 * Record a provider subscription ID from the frontend redirect.
 * Moves status to VERIFICATION_PENDING — backend does NOT trust this as payment proof.
 * A webhook or admin approval is required to move to ACTIVE.
 * State: PENDING → VERIFICATION_PENDING
 */
export async function verifySubscription(
  userId: string,
  subscriptionId: string,
  providerSubscriptionId: string,
): Promise<{ subscriptionId: string; status: 'verification_pending' }> {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
  if (!sub) throw new AppError(404, 'Subscription not found')
  if (sub.userId !== userId) throw new AppError(403, 'Access denied')
  if (sub.status !== 'PENDING') {
    throw new AppError(409, `Subscription is already in status: ${sub.status.toLowerCase()}`)
  }

  // Ensure no other sub has this provider ID (uniqueness guard)
  const conflicting = await prisma.subscription.findUnique({
    where: { providerSubscriptionId },
    select: { id: true },
  })
  if (conflicting && conflicting.id !== subscriptionId) {
    throw new AppError(409, 'Provider subscription ID already associated with another record')
  }

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'VERIFICATION_PENDING', providerSubscriptionId },
    }),
    prisma.subscriptionEvent.create({
      data: {
        subscriptionId,
        event: 'verification_pending',
        metadata: JSON.stringify({ providerSubscriptionId }),
      },
    }),
  ])

  return { subscriptionId, status: 'verification_pending' }
}

/**
 * Cancel the caller's current subscription.
 * State: ACTIVE | VERIFICATION_PENDING → CANCELED
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const sub = await getCurrentSubscription(userId)
  if (!sub) throw new AppError(404, 'No active subscription to cancel')
  if (sub.status === 'CANCELED') throw new AppError(409, 'Subscription is already canceled')

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    }),
    prisma.subscriptionEvent.create({
      data: { subscriptionId: sub.id, event: 'canceled' },
    }),
  ])

  fireNotification(
    userId,
    'SUBSCRIPTION_CANCELED',
    'Subscription canceled',
    'Your subscription has been canceled. You will retain access until the current period ends.',
    { subscriptionId: sub.id },
  )
}

// ─── Admin / Webhook ──────────────────────────────────────────────────────────

/**
 * Activate a subscription after payment is confirmed (webhook / admin).
 * State: VERIFICATION_PENDING | PENDING → ACTIVE
 * periodMonths: 1 for monthly, 12 for annual
 */
export async function activateSubscription(
  subscriptionId: string,
  opts: { periodMonths: number; providerSubscriptionId?: string },
): Promise<Subscription> {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
  if (!sub) throw new AppError(404, 'Subscription not found')
  if (!['PENDING', 'VERIFICATION_PENDING'].includes(sub.status)) {
    throw new AppError(409, `Cannot activate subscription in status: ${sub.status}`)
  }

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + opts.periodMonths)

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      ...(opts.providerSubscriptionId && { providerSubscriptionId: opts.providerSubscriptionId }),
    },
  })

  await logEvent(subscriptionId, 'activated', {
    periodEnd: periodEnd.toISOString(),
    periodMonths: opts.periodMonths,
  })

  fireNotification(
    sub.userId,
    'SUBSCRIPTION_ACTIVATED',
    'Premium activated!',
    `Your IntellectX Premium subscription is now active. Enjoy full access!`,
    { subscriptionId },
  )

  return updated
}

/**
 * Admin paginated list of all subscriptions.
 */
export async function listSubscriptions(params: {
  status?: string
  page?: number
  limit?: number
}) {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(50, params.limit ?? 20)
  const skip = (page - 1) * limit

  const where = params.status ? { status: params.status as never } : {}

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ])

  return { subscriptions, total, page, limit }
}
