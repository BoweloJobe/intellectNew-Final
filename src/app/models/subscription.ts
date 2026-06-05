import type { SubscriptionTier } from "../services/contracts/auth.contract";

export type SubscriptionPlanId = "free" | "pro";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionStatus =
  | "free"
  | "checkout-pending"
  | "verification-pending"
  | "active"
  | "expiring"
  | "expired"
  | "canceled";
export type SubscriptionProvider = "paypal";

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  features: string[];
  recommended?: boolean;
}

export interface SubscriptionOverview {
  tier: SubscriptionTier;
  activePlanId: SubscriptionPlanId;
  status: SubscriptionStatus;
  hasProAccess: boolean;
  billingCycle: BillingCycle | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingDate: string | null;
  pendingPlanChange: {
    planId: SubscriptionPlanId;
    billingCycle: BillingCycle;
    effectiveAt: string;
  } | null;
  providerMetadata: {
    provider: SubscriptionProvider;
    checkoutSessionId: string | null;
  } | null;
  lastUpgradeAt: string | null;
  lastVerifiedAt: string | null;
}

export interface CreateSubscriptionApprovalInput {
  userId: string;
  planId: SubscriptionPlanId;
  billingCycle: BillingCycle;
  provider: SubscriptionProvider;
  returnUrl: string;
  cancelUrl: string;
}

export interface CreateSubscriptionApprovalResult {
  checkoutSessionId: string;
  provider: SubscriptionProvider;
  approvalUrl: string;
  amountDueUsd: number;
  processingFeeUsd: number;
  totalDueUsd: number;
  currency: "USD";
  expiresAt: string;
}

export interface VerifySubscriptionReturnInput {
  userId: string;
  checkoutSessionId: string;
  provider: SubscriptionProvider;
  providerToken?: string | null;
  payerId?: string | null;
}

export interface VerifySubscriptionReturnResult {
  verificationStatus: "verified" | "failed";
  checkoutSessionId: string;
  provider: SubscriptionProvider;
  status: SubscriptionStatus;
  hasProAccess: boolean;
  billingCycle: BillingCycle | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  activatedAt: string | null;
  message: string;
}
