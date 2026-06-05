import type {
  BillingCycle,
  CreateSubscriptionApprovalInput,
  CreateSubscriptionApprovalResult,
  SubscriptionOverview,
  SubscriptionPlan,
  VerifySubscriptionReturnInput,
  VerifySubscriptionReturnResult,
} from "../models/subscription";

const plans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Start learning with core access.",
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    features: [
      "First 3 lessons per course",
      "Basic quizzes and tracking",
      "Community access",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Unlock all premium lessons and advanced tools.",
    monthlyPriceUsd: 19.99,
    annualPriceUsd: 199.0,
    features: [
      "Unlimited premium lessons",
      "Unlimited AI tutor sessions",
      "Advanced analytics and insights",
      "Priority support",
    ],
    recommended: true,
  },
];

function resolveAmount(planId: "free" | "pro", billingCycle: BillingCycle): number {
  const plan = plans.find((candidate) => candidate.id === planId) ?? plans[0];
  return billingCycle === "annual" ? plan.annualPriceUsd : plan.monthlyPriceUsd;
}

type PendingApprovalRecord = {
  checkoutSessionId: string;
  userId: string;
  planId: "free" | "pro";
  billingCycle: BillingCycle;
  provider: "paypal";
  expiresAt: string;
};

const PENDING_APPROVALS_STORAGE_KEY = "intellectx.mock.subscription.pendingApprovals.v1";
const STATUS_STORAGE_KEY = "intellectx.mock.subscription.currentStatus.v1";

function readLocalStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeLocalStorageJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function readPendingApprovals(): Record<string, PendingApprovalRecord> {
  return readLocalStorageJson<Record<string, PendingApprovalRecord>>(PENDING_APPROVALS_STORAGE_KEY, {});
}

function writePendingApprovals(value: Record<string, PendingApprovalRecord>): void {
  writeLocalStorageJson(PENDING_APPROVALS_STORAGE_KEY, value);
}

function readCurrentStatusByUserId(): Record<string, SubscriptionOverview> {
  return readLocalStorageJson<Record<string, SubscriptionOverview>>(STATUS_STORAGE_KEY, {});
}

function writeCurrentStatusByUserId(value: Record<string, SubscriptionOverview>): void {
  writeLocalStorageJson(STATUS_STORAGE_KEY, value);
}

function getDefaultOverview(currentTier: "free" | "pro"): SubscriptionOverview {
  const isPro = currentTier === "pro";

  return {
    tier: isPro ? "pro" : "free",
    activePlanId: isPro ? "pro" : "free",
    status: isPro ? "active" : "free",
    hasProAccess: isPro,
    billingCycle: isPro ? "monthly" : null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    nextBillingDate: isPro ? nextBillingDateFromNow("monthly") : null,
    pendingPlanChange: null,
    providerMetadata: null,
    lastUpgradeAt: null,
    lastVerifiedAt: null,
  };
}

function buildApprovalUrl(input: CreateSubscriptionApprovalInput, checkoutSessionId: string): string {
  const separator = input.returnUrl.includes("?") ? "&" : "?";
  const token = `mock-token-${checkoutSessionId}`;
  const payerId = `mock-payer-${checkoutSessionId}`;

  return `${input.returnUrl}${separator}checkoutSessionId=${encodeURIComponent(checkoutSessionId)}&provider=${encodeURIComponent(input.provider)}&token=${encodeURIComponent(token)}&PayerID=${encodeURIComponent(payerId)}`;
}

function nextBillingDateFromNow(billingCycle: BillingCycle): string {
  const nextDate = new Date();
  if (billingCycle === "annual") {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate.toISOString();
}

function resolveCurrentPeriodRange(billingCycle: BillingCycle): {
  currentPeriodStart: string;
  currentPeriodEnd: string;
} {
  const start = new Date();
  const end = new Date(start);

  if (billingCycle === "annual") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }

  return {
    currentPeriodStart: start.toISOString(),
    currentPeriodEnd: end.toISOString(),
  };
}

function withExpiringStatus(overview: SubscriptionOverview): SubscriptionOverview {
  if (overview.status !== "active" || !overview.currentPeriodEnd) {
    return overview;
  }

  const msUntilPeriodEnd = new Date(overview.currentPeriodEnd).getTime() - Date.now();

  if (msUntilPeriodEnd <= 72 * 60 * 60 * 1000) {
    return {
      ...overview,
      status: "expiring",
    };
  }

  return overview;
}

export function getSubscriptionPlansMock(): SubscriptionPlan[] {
  return plans;
}

export function getSubscriptionOverviewMock(input: {
  userId: string;
  currentTier: "free" | "pro";
}): SubscriptionOverview {
  const currentStatusByUserId = readCurrentStatusByUserId();
  const currentOverview = currentStatusByUserId[input.userId] ?? getDefaultOverview(input.currentTier);
  return withExpiringStatus(currentOverview);
}

export function createSubscriptionApprovalMock(input: CreateSubscriptionApprovalInput): CreateSubscriptionApprovalResult {
  const amountDueUsd = resolveAmount(input.planId, input.billingCycle);
  const processingFeeUsd = amountDueUsd > 0 ? 0.99 : 0;
  const checkoutSessionId = `session-${Date.now()}`;
  const expiresAtDate = new Date(Date.now() + 15 * 60 * 1000);

  const pendingApprovals = readPendingApprovals();
  pendingApprovals[checkoutSessionId] = {
    checkoutSessionId,
    userId: input.userId,
    planId: input.planId,
    billingCycle: input.billingCycle,
    provider: input.provider,
    expiresAt: expiresAtDate.toISOString(),
  };
  writePendingApprovals(pendingApprovals);

  const currentStatusByUserId = readCurrentStatusByUserId();
  const existingStatus = currentStatusByUserId[input.userId];
  currentStatusByUserId[input.userId] = {
    tier: existingStatus?.tier === "pro" ? "pro" : "free",
    activePlanId: input.planId,
    status: "checkout-pending",
    hasProAccess: false,
    billingCycle: input.billingCycle,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    nextBillingDate: null,
    pendingPlanChange: null,
    providerMetadata: {
      provider: input.provider,
      checkoutSessionId,
    },
    lastUpgradeAt: existingStatus?.lastUpgradeAt ?? null,
    lastVerifiedAt: existingStatus?.lastVerifiedAt ?? null,
  };
  writeCurrentStatusByUserId(currentStatusByUserId);

  return {
    checkoutSessionId,
    provider: input.provider,
    approvalUrl: buildApprovalUrl(input, checkoutSessionId),
    amountDueUsd,
    processingFeeUsd,
    totalDueUsd: amountDueUsd + processingFeeUsd,
    currency: "USD",
    expiresAt: expiresAtDate.toISOString(),
  };
}

export function verifySubscriptionReturnMock(
  input: VerifySubscriptionReturnInput,
): VerifySubscriptionReturnResult {
  const pendingApprovals = readPendingApprovals();
  const pendingApproval = pendingApprovals[input.checkoutSessionId];
  const nowIso = new Date().toISOString();

  const currentStatusByUserId = readCurrentStatusByUserId();
  const previousOverview = currentStatusByUserId[input.userId] ?? getDefaultOverview("free");
  currentStatusByUserId[input.userId] = {
    ...previousOverview,
    status: "verification-pending",
    hasProAccess: false,
    providerMetadata: {
      provider: input.provider,
      checkoutSessionId: input.checkoutSessionId,
    },
  };
  writeCurrentStatusByUserId(currentStatusByUserId);

  if (!pendingApproval || pendingApproval.userId !== input.userId || pendingApproval.provider !== input.provider) {
    return {
      verificationStatus: "failed",
      checkoutSessionId: input.checkoutSessionId,
      provider: input.provider,
      status: "canceled",
      hasProAccess: false,
      billingCycle: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      activatedAt: null,
      message: "Subscription session was not found or is no longer valid.",
    };
  }

  if (new Date(pendingApproval.expiresAt).getTime() <= Date.now()) {
    delete pendingApprovals[input.checkoutSessionId];
    writePendingApprovals(pendingApprovals);

    currentStatusByUserId[input.userId] = {
      ...currentStatusByUserId[input.userId],
      ...getDefaultOverview("free"),
      status: "expired",
      providerMetadata: {
        provider: input.provider,
        checkoutSessionId: input.checkoutSessionId,
      },
      lastVerifiedAt: nowIso,
    };
    writeCurrentStatusByUserId(currentStatusByUserId);

    return {
      verificationStatus: "failed",
      checkoutSessionId: input.checkoutSessionId,
      provider: input.provider,
      status: "expired",
      hasProAccess: false,
      billingCycle: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      activatedAt: null,
      message: "Subscription approval expired. Please start checkout again.",
    };
  }

  if (!input.providerToken || !input.payerId) {
    return {
      verificationStatus: "failed",
      checkoutSessionId: input.checkoutSessionId,
      provider: input.provider,
      status: "canceled",
      hasProAccess: false,
      billingCycle: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      activatedAt: null,
      message: "Payment provider return data is incomplete. Verification could not be completed.",
    };
  }

  const isProPlan = pendingApproval.planId === "pro";
  const periodRange = resolveCurrentPeriodRange(pendingApproval.billingCycle);
  currentStatusByUserId[input.userId] = {
    tier: isProPlan ? "pro" : "free",
    activePlanId: pendingApproval.planId,
    status: isProPlan ? "active" : "free",
    hasProAccess: isProPlan,
    billingCycle: isProPlan ? pendingApproval.billingCycle : null,
    currentPeriodStart: isProPlan ? periodRange.currentPeriodStart : null,
    currentPeriodEnd: isProPlan ? periodRange.currentPeriodEnd : null,
    nextBillingDate: isProPlan ? periodRange.currentPeriodEnd : null,
    pendingPlanChange: null,
    providerMetadata: {
      provider: input.provider,
      checkoutSessionId: input.checkoutSessionId,
    },
    lastUpgradeAt: isProPlan ? nowIso : null,
    lastVerifiedAt: nowIso,
  };
  writeCurrentStatusByUserId(currentStatusByUserId);

  delete pendingApprovals[input.checkoutSessionId];
  writePendingApprovals(pendingApprovals);

  return {
    verificationStatus: "verified",
    checkoutSessionId: input.checkoutSessionId,
    provider: input.provider,
    status: isProPlan ? "active" : "free",
    hasProAccess: isProPlan,
    billingCycle: isProPlan ? pendingApproval.billingCycle : null,
    currentPeriodStart: isProPlan ? periodRange.currentPeriodStart : null,
    currentPeriodEnd: isProPlan ? periodRange.currentPeriodEnd : null,
    activatedAt: isProPlan ? nowIso : null,
    message: "Subscription verified. Backend-ready status is now active in mock mode.",
  };
}

export function getCurrentSubscriptionStatusMock(input: {
  userId: string;
  currentTier: "free" | "pro";
}): SubscriptionOverview {
  const currentStatusByUserId = readCurrentStatusByUserId();
  const currentOverview = currentStatusByUserId[input.userId] ?? getDefaultOverview(input.currentTier);
  return withExpiringStatus(currentOverview);
}
