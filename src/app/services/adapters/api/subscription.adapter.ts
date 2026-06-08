import type { SubscriptionService } from "../../contracts/subscription.contract";
import type {
  CreateSubscriptionApprovalInput,
  CreateSubscriptionApprovalResult,
  SubscriptionOverview,
  SubscriptionPlan,
  VerifySubscriptionReturnInput,
  VerifySubscriptionReturnResult,
} from "../../../models/subscription";
import { httpClient, toApiError } from "../../../api";
import { readStoredAuthSession } from "../../../auth/auth-storage";

// ─── Backend Response Shapes ──────────────────────────────────────────────────

interface BackendSubscriptionState {
  status: "free" | "pending" | "verification_pending" | "active" | "expired" | "canceled";
  tier: "free" | "premium";
  isPremium: boolean;
  billingCycle: "monthly" | "annual" | null;
  currentPeriodEnd: string | null;
  provider: string | null;
  subscriptionId: string | null;
}

interface BackendSubscriptionStateResponse {
  data: BackendSubscriptionState;
}

interface BackendCheckoutSessionResult {
  subscriptionId: string;
  status: "pending";
  provider: "paypal" | null;
  checkoutUrl: string | null;
  providerPlanId: string | null;
  billingCycle: "monthly" | "annual";
  tier: "premium";
  pricing: { amount: string; currency: string };
}

interface BackendCheckoutResponse {
  data: BackendCheckoutSessionResult;
}

interface BackendVerifyResponse {
  data: { subscriptionId: string; status: "verification_pending" };
}

// ─── Static plan data ─────────────────────────────────────────────────────────
// The backend has no /plans endpoint; actual pricing is resolved server-side at
// checkout time.  These records are used only for display in the CheckoutPage.

const STATIC_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Start learning with core access.",
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    features: ["First 3 lessons per course", "Basic quizzes and tracking", "Community access"],
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = readStoredAuthSession()?.tokens?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function mapBackendStateToOverview(state: BackendSubscriptionState): SubscriptionOverview {
  const statusMap: Record<string, SubscriptionOverview["status"]> = {
    free: "free",
    pending: "checkout-pending",
    verification_pending: "verification-pending",
    active: "active",
    expired: "expired",
    canceled: "canceled",
  };

  const tier: "free" | "pro" = state.tier === "premium" ? "pro" : "free";

  return {
    tier,
    activePlanId: tier,
    status: statusMap[state.status] ?? "free",
    hasProAccess: state.isPremium,
    billingCycle: state.billingCycle,
    currentPeriodStart: null,
    currentPeriodEnd: state.currentPeriodEnd,
    nextBillingDate: state.currentPeriodEnd,
    pendingPlanChange: null,
    providerMetadata:
      state.provider !== null
        ? { provider: "paypal", checkoutSessionId: state.subscriptionId }
        : null,
    lastUpgradeAt: null,
    lastVerifiedAt: null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidApprovalUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class ApiSubscriptionAdapter implements SubscriptionService {
  /**
   * No backend /plans endpoint exists — return static display data.
   * Real pricing is determined by the server at checkout time.
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    return Promise.resolve(STATIC_PLANS);
  }

  /** GET /api/subscriptions/me */
  async getSubscriptionOverview(
    _input: { userId: string; currentTier: "free" | "pro" },
  ): Promise<SubscriptionOverview> {
    try {
      const response = await httpClient.get<BackendSubscriptionStateResponse>("/subscriptions/me", {
        headers: authHeaders(),
      });
      return mapBackendStateToOverview(response.data);
    } catch (error) {
      throw toApiError(error, { operation: "subscription.getSubscriptionOverview" });
    }
  }

  /**
   * POST /api/subscriptions/checkout
   * Backend only needs billingCycle.  Returns the subscription record ID that
   * must be sent back as subscriptionId during the verify step.
   * checkoutUrl is null until PayPal plan IDs are configured on the backend.
   */
  async createSubscriptionApproval(
    input: CreateSubscriptionApprovalInput,
  ): Promise<CreateSubscriptionApprovalResult> {
    try {
      const response = await httpClient.post<
        BackendCheckoutResponse,
        { billingCycle: "monthly" | "annual" }
      >("/subscriptions/checkout", {
        body: { billingCycle: input.billingCycle },
        headers: authHeaders(),
      });

      const checkout = response.data;
      const amountDueUsd = parseFloat(checkout.pricing.amount) || 0;
      const approvalUrl = checkout.checkoutUrl?.trim() ?? "";

      if (!isValidApprovalUrl(approvalUrl)) {
        throw new Error(
          "Subscription approval URL is missing or invalid. Please try again later.",
        );
      }

      return {
        checkoutSessionId: checkout.subscriptionId,
        provider: checkout.provider ?? "paypal",
        approvalUrl,
        amountDueUsd,
        processingFeeUsd: 0,
        totalDueUsd: amountDueUsd,
        currency: "USD",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      throw toApiError(error, { operation: "subscription.createSubscriptionApproval" });
    }
  }

  /**
   * POST /api/subscriptions/verify
   * Submits the provider subscription ID returned from the PayPal redirect.
   * Backend moves the record to VERIFICATION_PENDING.
   * Actual ACTIVE promotion happens via webhook or admin action (backend only).
   */
  async verifySubscriptionReturn(
    input: VerifySubscriptionReturnInput,
  ): Promise<VerifySubscriptionReturnResult> {
    try {
      const providerSubscriptionId = input.providerToken ?? input.payerId ?? "";

      await httpClient.post<BackendVerifyResponse, { subscriptionId: string; providerSubscriptionId: string }>(
        "/subscriptions/verify",
        {
          body: {
            subscriptionId: input.checkoutSessionId,
            providerSubscriptionId,
          },
          headers: authHeaders(),
        },
      );

      return {
        verificationStatus: "verified",
        checkoutSessionId: input.checkoutSessionId,
        provider: input.provider,
        status: "verification-pending",
        hasProAccess: false,
        billingCycle: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        activatedAt: null,
        message:
          "Subscription submitted for verification. Premium access activates upon payment confirmation.",
      };
    } catch (error) {
      throw toApiError(error, { operation: "subscription.verifySubscriptionReturn" });
    }
  }

  /** GET /api/subscriptions/me */
  async getCurrentSubscriptionStatus(
    _input: { userId: string; currentTier: "free" | "pro" },
  ): Promise<SubscriptionOverview> {
    try {
      const response = await httpClient.get<BackendSubscriptionStateResponse>("/subscriptions/me", {
        headers: authHeaders(),
      });
      return mapBackendStateToOverview(response.data);
    } catch (error) {
      throw toApiError(error, { operation: "subscription.getCurrentSubscriptionStatus" });
    }
  }
}
