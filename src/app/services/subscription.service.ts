import type {
  BillingCycle,
  CreateSubscriptionApprovalResult,
  SubscriptionOverview,
  SubscriptionPlan,
  VerifySubscriptionReturnResult,
} from "../models/subscription";
import { getSubscriptionService } from "./factory/service-registry";

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return getSubscriptionService().getPlans();
}

export async function getSubscriptionOverview(input: {
  userId: string;
  currentTier: "free" | "pro";
}): Promise<SubscriptionOverview> {
  return getSubscriptionService().getSubscriptionOverview(input);
}

export async function createSubscriptionApproval(input: {
  userId: string;
  planId: "free" | "pro";
  billingCycle: BillingCycle;
  provider: "paypal";
  returnUrl: string;
  cancelUrl: string;
}): Promise<CreateSubscriptionApprovalResult> {
  return getSubscriptionService().createSubscriptionApproval(input);
}

export async function verifySubscriptionReturn(input: {
  userId: string;
  checkoutSessionId: string;
  provider: "paypal";
  providerToken?: string | null;
  payerId?: string | null;
}): Promise<VerifySubscriptionReturnResult> {
  return getSubscriptionService().verifySubscriptionReturn(input);
}

export async function getCurrentSubscriptionStatus(input: {
  userId: string;
  currentTier: "free" | "pro";
}): Promise<SubscriptionOverview> {
  return getSubscriptionService().getCurrentSubscriptionStatus(input);
}
