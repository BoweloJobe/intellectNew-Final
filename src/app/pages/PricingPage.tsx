import { Link } from "react-router-dom";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/ui/button";
import { Check } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

function formatStatusLabel(status: string): string {
  return status
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PricingPage() {
  const { isAuthenticated, subscription } = useAuth();
  const nextBillingLabel = subscription.nextBillingDate
    ? new Date(subscription.nextBillingDate).toLocaleDateString()
    : null;
  const plans = [
    {
      name: "Student",
      price: "$9.99",
      period: "per month",
      description: "Perfect for individual learners",
      features: [
        "Access to all courses",
        "AI Tutor with 50 queries/month",
        "Progress tracking & analytics",
        "Quiz & assessment tools",
        "Community access",
        "Mobile app access",
        "Email support"
      ],
      popular: false
    },
    {
      name: "Pro",
      price: "$19.99",
      period: "per month",
      description: "For serious students who want more",
      features: [
        "Everything in Student plan",
        "Unlimited AI Tutor queries",
        "Advanced analytics & insights",
        "Priority support",
        "Offline mode",
        "Custom study plans",
        "Certificate of completion",
        "1-on-1 instructor sessions (2/month)"
      ],
      popular: true
    },
    {
      name: "Institution",
      price: "Custom",
      period: "contact us",
      description: "Built for schools and organizations",
      features: [
        "Everything in Pro plan",
        "Unlimited student accounts",
        "Advanced admin controls",
        "Custom branding",
        "API access",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee",
        "Training & onboarding"
      ],
      popular: false
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      {/* Header */}
      <div className="text-center mb-20">
        <h1 className="text-5xl font-semibold mb-4 text-gray-900">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-700 max-w-2xl mx-auto">
          Unlock your full learning potential with <span style={{fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'}}>intellectX</span>. Start free for 14 days.
        </p>
        <p className="mt-4 text-sm text-gray-600">
          Current subscription: <span className="font-semibold">{formatStatusLabel(subscription.status)}</span>
        </p>
        {subscription.billingCycle ? (
          <p className="mt-1 text-xs text-gray-500">
            Billing cycle: {subscription.billingCycle.toUpperCase()}
            {nextBillingLabel ? ` - Next billing ${nextBillingLabel}` : ""}
          </p>
        ) : null}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        {plans.map((plan, index) => (
          <GlassCard 
            key={index} 
            className={`flex flex-col ${
              plan.popular 
                ? 'ring-2 ring-[#4a9ff5] relative' 
                : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#4a9ff5] text-white text-sm font-medium rounded-full">
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-2 text-gray-900">{plan.name}</h3>
              <p className="text-gray-600 mb-6">{plan.description}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-semibold text-gray-900">{plan.price}</span>
                <span className="text-gray-600">{plan.period}</span>
              </div>
            </div>

            <div className="flex-1 mb-8">
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[#4a9ff5] flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to={
                plan.name === "Institution"
                  ? "/community"
                  : plan.name === "Pro"
                    ? isAuthenticated
                      ? subscription.hasProAccess
                        ? "/courses"
                        : "/checkout?plan=pro&returnTo=%2Fpricing"
                      : "/signup"
                    : isAuthenticated
                      ? "/courses"
                      : "/signup"
              }
            >
              <Button 
                className={`w-full ${
                  plan.popular 
                    ? 'bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white' 
                    : 'bg-white/[0.45] text-gray-900 hover:bg-white/[0.55]'
                }`}
              >
                {plan.name === "Institution"
                  ? "Contact Sales"
                  : plan.name === "Pro"
                    ? subscription.hasProAccess
                      ? "Current Plan"
                      : "Upgrade to Pro"
                    : "Continue with Free"}
              </Button>
            </Link>
          </GlassCard>
        ))}
      </div>

      {/* FAQ */}
      <GlassCard>
        <h2 className="text-3xl font-semibold mb-12 text-center text-gray-900">
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-8 max-w-3xl mx-auto">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              Can I cancel my subscription anytime?
            </h3>
            <p className="text-gray-700">
              Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              Is there a student discount?
            </h3>
            <p className="text-gray-700">
              Yes! We offer a 20% discount for students with a valid .edu email address. The discount is automatically applied during signup.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              What payment methods do you accept?
            </h3>
            <p className="text-gray-700">
              We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for institutional plans.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Can I upgrade or downgrade my plan?
            </h3>
            <p className="text-gray-700">
              Absolutely! You can change your plan at any time from your account settings. Changes take effect immediately.
            </p>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-gray-600">
          Subscription use is subject to the{" "}
          <Link to="/terms" className="font-semibold text-[#4a9ff5] hover:text-[#2e8ef7]">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-semibold text-[#4a9ff5] hover:text-[#2e8ef7]">
            Privacy Policy
          </Link>
          .
        </p>
      </GlassCard>
    </div>
  );
}
