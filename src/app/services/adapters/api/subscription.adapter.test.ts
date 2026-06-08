import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiSubscriptionAdapter } from "./subscription.adapter";

vi.mock("../../../api", () => ({
  httpClient: {
    post: vi.fn(),
  },
  toApiError: (error: unknown) => error,
}));

describe("ApiSubscriptionAdapter", () => {
  let mockPost: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const api = await import("../../../api");
    mockPost = api.httpClient.post as ReturnType<typeof vi.fn>;
    mockPost.mockReset();
  });

  it("returns approvalUrl when backend checkoutUrl is valid", async () => {
    mockPost.mockResolvedValue({
      data: {
        subscriptionId: "sub_123",
        status: "pending",
        provider: "paypal",
        checkoutUrl: "https://www.paypal.com/checkoutnow?token=abc123",
        providerPlanId: "plan_abc",
        billingCycle: "monthly",
        tier: "premium",
        pricing: { amount: "19.99", currency: "USD" },
      },
    });

    const adapter = new ApiSubscriptionAdapter();
    const result = await adapter.createSubscriptionApproval({
      userId: "user_1",
      planId: "pro",
      billingCycle: "monthly",
      provider: "paypal",
      returnUrl: "https://example.com/checkout/success",
      cancelUrl: "https://example.com/checkout?cancelled=true",
    });

    expect(result.approvalUrl).toBe("https://www.paypal.com/checkoutnow?token=abc123");
    expect(result.checkoutSessionId).toBe("sub_123");
  });

  it("throws when backend checkoutUrl is null", async () => {
    mockPost.mockResolvedValue({
      data: {
        subscriptionId: "sub_123",
        status: "pending",
        provider: "paypal",
        checkoutUrl: null,
        providerPlanId: "plan_abc",
        billingCycle: "monthly",
        tier: "premium",
        pricing: { amount: "19.99", currency: "USD" },
      },
    });

    const adapter = new ApiSubscriptionAdapter();
    await expect(
      adapter.createSubscriptionApproval({
        userId: "user_1",
        planId: "pro",
        billingCycle: "monthly",
        provider: "paypal",
        returnUrl: "https://example.com/checkout/success",
        cancelUrl: "https://example.com/checkout?cancelled=true",
      }),
    ).rejects.toThrow("approval URL is missing or invalid");
  });

  it("throws when backend checkoutUrl is invalid", async () => {
    mockPost.mockResolvedValue({
      data: {
        subscriptionId: "sub_123",
        status: "pending",
        provider: "paypal",
        checkoutUrl: "not-a-valid-url",
        providerPlanId: "plan_abc",
        billingCycle: "monthly",
        tier: "premium",
        pricing: { amount: "19.99", currency: "USD" },
      },
    });

    const adapter = new ApiSubscriptionAdapter();
    await expect(
      adapter.createSubscriptionApproval({
        userId: "user_1",
        planId: "pro",
        billingCycle: "monthly",
        provider: "paypal",
        returnUrl: "https://example.com/checkout/success",
        cancelUrl: "https://example.com/checkout?cancelled=true",
      }),
    ).rejects.toThrow("approval URL is missing or invalid");
  });
});
