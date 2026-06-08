import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { DataErrorState } from "../components/DataState";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/ui/button";
import { useAsyncFormSubmission } from "../hooks/useAsyncFormSubmission";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { useAuth } from "../auth/AuthContext";
import type { BillingCycle, SubscriptionPlan, SubscriptionPlanId } from "../models/subscription";
import {
  createSubscriptionApproval,
  getSubscriptionPlans,
} from "../services/subscription.service";

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function isValidApprovalUrl(value: unknown): value is string {
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

export function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, subscription } = useAuth();
  const { isLoading, isError, errorMessage, run: runLoadCheckout } = useAsyncViewState({
    defaultErrorMessage: "Checkout details could not be loaded. Please retry.",
  });
  const submission = useAsyncFormSubmission();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const planFromQuery = (searchParams.get("plan") as SubscriptionPlanId | null) ?? "pro";
  const returnTo = searchParams.get("returnTo") || "/courses";

  const selectedPlan = useMemo(() => {
    const plan = plans.find((candidate) => candidate.id === planFromQuery);
    return plan ?? plans.find((candidate) => candidate.id === "pro") ?? null;
  }, [planFromQuery, plans]);
  const isCheckoutLifecyclePending =
    subscription.status === "checkout-pending" || subscription.status === "verification-pending";

  useEffect(() => {
    if (!user) {
      return;
    }

    void runLoadCheckout(async () => {
      const availablePlans = await getSubscriptionPlans();
      setPlans(availablePlans);
      return availablePlans;
    });
  }, [runLoadCheckout, user]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <DataErrorState
          title="Checkout requires login"
          description="Sign in to continue with your subscription upgrade."
          retryLabel="Go to Login"
          onRetry={() => {
            navigate("/login");
          }}
        />
      </div>
    );
  }

  if (subscription.hasProAccess) {
    return (
      <div className="max-w-4xl mx-auto px-4 pb-20 space-y-6">
        <GlassCard>
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">You Already Have Pro</h1>
          <p className="text-gray-700 mb-6">Your account is already on Pro and premium lessons are unlocked.</p>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
              onClick={() => {
                navigate(returnTo);
              }}
            >
              Continue to Premium Content
            </Button>
            <Link to="/settings">
              <Button variant="outline" className="bg-white/[0.45]">Manage Billing</Button>
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  const price = selectedPlan
    ? billingCycle === "annual"
      ? selectedPlan.annualPriceUsd
      : selectedPlan.monthlyPriceUsd
    : 0;
  const fee = price > 0 ? 0.99 : 0;
  const total = price + fee;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 space-y-6">
      <div>
        <h1 className="text-4xl font-semibold text-gray-900 mb-2">Checkout</h1>
        <p className="text-gray-700">Upgrade your account to unlock premium lessons and advanced tools.</p>
      </div>

      {isCheckoutLifecyclePending ? (
        <GlassCard>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900 mb-1">Subscription In Progress</p>
            <p className="text-sm text-amber-800">
              We still have a pending checkout/verification state for your account. You can continue checkout or return to
              billing to review status.
            </p>
            {subscription.providerMetadata?.checkoutSessionId ? (
              <p className="text-xs text-amber-700 mt-2">
                Session: {subscription.providerMetadata.checkoutSessionId}
              </p>
            ) : null}
          </div>
        </GlassCard>
      ) : null}

      {isError ? (
        <DataErrorState
          title="Unable to load checkout"
          description={errorMessage ?? "Checkout details could not be loaded. Please retry."}
          onRetry={() => {
            if (!user) {
              return;
            }

            void runLoadCheckout(async () => {
              const availablePlans = await getSubscriptionPlans();
              setPlans(availablePlans);
              return availablePlans;
            });
          }}
          retryLabel="Retry"
        />
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Selected Plan</h2>
            <div className="rounded-xl border border-white/60 bg-white/[0.45] p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="font-semibold text-gray-900">{selectedPlan?.name ?? "Pro"}</p>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#4a9ff5]/10 text-[#1c7ed6]">
                  Upgrade
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">{selectedPlan?.description ?? "Premium access"}</p>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={billingCycle === "monthly" ? "default" : "outline"}
                  className={billingCycle === "monthly" ? "bg-[#4a9ff5] text-white" : "bg-white/[0.45]"}
                  onClick={() => {
                    setBillingCycle("monthly");
                  }}
                >
                  Monthly
                </Button>
                <Button
                  type="button"
                  variant={billingCycle === "annual" ? "default" : "outline"}
                  className={billingCycle === "annual" ? "bg-[#4a9ff5] text-white" : "bg-white/[0.45]"}
                  onClick={() => {
                    setBillingCycle("annual");
                  }}
                >
                  Annual (Save)
                </Button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment Provider</h2>
            <div className="rounded-xl border border-[#4a9ff5] bg-[#4a9ff5]/10 p-4">
              <p className="font-semibold text-gray-900">PayPal Subscription Approval</p>
              <p className="text-sm text-gray-600 mt-1">
                You will be redirected to PayPal to approve your subscription, then returned here for verification.
              </p>
            </div>
          </section>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              Frontend is now wired for backend-driven verification. Premium access unlocks only after return verification.
            </p>
          </div>

          {subscription.pendingPlanChange ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm text-sky-900">
                Pending plan change: {subscription.pendingPlanChange.planId.toUpperCase()} ({subscription.pendingPlanChange.billingCycle})
              </p>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard className="space-y-4 h-fit">
          <h2 className="text-lg font-semibold text-gray-900">Billing Summary</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span>Plan</span>
              <span className="font-medium">{selectedPlan?.name ?? "Pro"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cycle</span>
              <span className="font-medium capitalize">{billingCycle}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-medium">{formatUsd(price)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Processing Fee</span>
              <span className="font-medium">{formatUsd(fee)}</span>
            </div>
            <div className="border-t border-gray-200 my-2" />
            <div className="flex items-center justify-between text-base text-gray-900 font-semibold">
              <span>Total Due Today</span>
              <span>{formatUsd(total)}</span>
            </div>
          </div>

          {submission.submitError ? (
            <DataErrorState
              title="Checkout failed"
              description={submission.submitError}
              retryLabel="Retry"
              onRetry={() => {
                submission.clearStatus();
              }}
            />
          ) : null}

          <Button
            className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
            disabled={isLoading || !selectedPlan || submission.isSubmitting}
            onClick={() => {
              if (!selectedPlan) {
                return;
              }

              void submission.run(
                async () => {
                  const returnUrl = `${window.location.origin}/checkout/success?returnTo=${encodeURIComponent(returnTo)}`;
                  const cancelUrl = `${window.location.origin}/checkout?plan=${encodeURIComponent(selectedPlan.id)}&returnTo=${encodeURIComponent(returnTo)}`;

                  return createSubscriptionApproval({
                    userId: user.id,
                    planId: selectedPlan.id,
                    billingCycle,
                    provider: "paypal",
                    returnUrl,
                    cancelUrl,
                  });
                },
                {
                  successMessage: "Redirecting to PayPal approval...",
                  onSuccess: async (result) => {
                    if (!isValidApprovalUrl(result.approvalUrl)) {
                      throw new Error(
                        "Unable to continue checkout because the approval URL is missing or invalid.",
                      );
                    }
                    window.location.assign(result.approvalUrl);
                  },
                },
              );
            }}
          >
            {submission.isSubmitting ? "Redirecting..." : "Upgrade with PayPal"}
          </Button>

          <p className="text-xs text-gray-500">
            Final payment execution and subscription activation remain backend responsibilities.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
