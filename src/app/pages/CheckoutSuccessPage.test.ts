import { describe, expect, it } from "vitest";
import { getCheckoutSuccessDisplay } from "./CheckoutSuccessPage";

describe("getCheckoutSuccessDisplay", () => {
  it("does not claim premium access is active when verification returns without Pro access", () => {
    expect(getCheckoutSuccessDisplay("success", false)).toEqual({
      title: "Subscription Verified",
      primaryActionLabel: "Return",
    });
  });

  it("uses premium-access copy only after verified status includes Pro access", () => {
    expect(getCheckoutSuccessDisplay("success", true)).toEqual({
      title: "Subscription Activated",
      primaryActionLabel: "Return to Premium Content",
    });
  });
});
