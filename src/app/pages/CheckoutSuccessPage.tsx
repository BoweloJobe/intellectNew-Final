import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/ui/button";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getCurrentSubscriptionStatus, verifySubscriptionReturn } from "../services/subscription.service";

type VerificationViewState = "verifying" | "success" | "failed";

function formatStatusLabel(status: string): string {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const { user, subscription, applyVerifiedSubscriptionStatus } = useAuth();
  const [searchParams] = useSearchParams();
  const [retryNonce, setRetryNonce] = useState(0);
  const [viewState, setViewState] = useState<VerificationViewState>("verifying");
  const [statusMessage, setStatusMessage] = useState("Verifying your subscription status...");

  const returnTo = searchParams.get("returnTo") || "/courses";
  const checkoutSessionId = searchParams.get("checkoutSessionId") ?? "";
  const provider = (searchParams.get("provider") ?? "paypal") as "paypal";
  const providerToken = searchParams.get("token");
  const payerId = searchParams.get("PayerID") ?? searchParams.get("payerId");

  const currentTier = useMemo<"free" | "pro">(() => {
    return user?.subscriptionTier === "pro" ? "pro" : "free";
  }, [user?.subscriptionTier]);

  useEffect(() => {
    let isCancelled = false;

    if (!user) {
      setViewState("failed");
      setStatusMessage("You must be signed in to verify this subscription return.");
      return;
    }

    if (!checkoutSessionId) {
      setViewState("failed");
      setStatusMessage("Missing checkout session information from the payment provider return.");
      return;
    }

    setViewState("verifying");
    setStatusMessage("Verifying your subscription status...");

    applyVerifiedSubscriptionStatus({
      ...subscription,
      status: "verification-pending",
      hasProAccess: false,
      providerMetadata: {
        provider,
        checkoutSessionId,
      },
    });

    void (async () => {
      try {
        const verification = await verifySubscriptionReturn({
          userId: user.id,
          checkoutSessionId,
          provider,
          providerToken,
          payerId,
        });

        const currentStatus = await getCurrentSubscriptionStatus({
          userId: user.id,
          currentTier,
        });

        if (isCancelled) {
          return;
        }

        applyVerifiedSubscriptionStatus(currentStatus);

        if (verification.verificationStatus === "verified") {
          setViewState("success");
          setStatusMessage(
            currentStatus.hasProAccess
              ? "Subscription verified and activated. Premium access is now unlocked."
              : "Subscription verification completed.",
          );
          return;
        }

        setViewState("failed");
        setStatusMessage(verification.message || "Subscription could not be verified.");
      } catch {
        if (isCancelled) {
          return;
        }

        setViewState("failed");
        setStatusMessage("Verification failed due to a temporary issue. Please retry.");
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [applyVerifiedSubscriptionStatus, checkoutSessionId, currentTier, payerId, provider, providerToken, retryNonce, user]);

  const Icon = viewState === "verifying" ? LoaderCircle : viewState === "success" ? CheckCircle2 : TriangleAlert;
  const iconClasses =
    viewState === "verifying"
      ? "bg-blue-100 text-blue-700"
      : viewState === "success"
        ? "bg-green-100 text-green-700"
        : "bg-amber-100 text-amber-700";

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <GlassCard className="text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${iconClasses}`}>
          <Icon className={`h-9 w-9 ${viewState === "verifying" ? "animate-spin" : ""}`} />
        </div>

        <h1 className="text-3xl font-semibold text-gray-900 mb-2">
          {viewState === "verifying" ? "Verifying Subscription" : viewState === "success" ? "Subscription Activated" : "Verification Failed"}
        </h1>
        <p className="text-gray-700 mb-6">{statusMessage}</p>

        <div className="rounded-xl border border-white/60 bg-white/[0.45] p-4 mb-6 text-left max-w-xl mx-auto">
          <p className="text-sm text-gray-600 mb-1">Checkout Session</p>
          <p className="text-sm font-semibold text-gray-900">{checkoutSessionId || "Unavailable"}</p>
          <p className="text-xs text-gray-500 mt-3">Provider: {provider.toUpperCase()}</p>
          <p className="text-xs text-gray-500 mt-1">Current status: {formatStatusLabel(subscription.status)}</p>
          {subscription.billingCycle ? (
            <p className="text-xs text-gray-500 mt-1">Billing cycle: {subscription.billingCycle.toUpperCase()}</p>
          ) : null}
          {subscription.nextBillingDate ? (
            <p className="text-xs text-gray-500 mt-1">
              Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString()}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {viewState === "failed" ? (
            <Button
              className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
              onClick={() => {
                setRetryNonce((previous) => previous + 1);
              }}
            >
              Retry Verification
            </Button>
          ) : null}

          <Button
            className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
            disabled={viewState === "verifying"}
            onClick={() => {
              navigate(returnTo);
            }}
          >
            {viewState === "success" ? "Return to Premium Content" : "Return"}
          </Button>
          <Link to="/settings">
            <Button variant="outline" className="bg-white/[0.45]">View Billing Settings</Button>
          </Link>
          <Link to="/courses">
            <Button variant="outline" className="bg-white/[0.45]">Browse Courses</Button>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
