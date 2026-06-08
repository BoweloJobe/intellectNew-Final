import { describe, expect, it } from "vitest";
import { isValidApprovalUrl } from "./CheckoutPage";

describe("isValidApprovalUrl", () => {
  it("accepts a valid http or https approval URL", () => {
    expect(isValidApprovalUrl("https://example.com/paypal?token=abc")).toBe(true);
  });

  it("rejects empty, null, or invalid values", () => {
    expect(isValidApprovalUrl("")).toBe(false);
    expect(isValidApprovalUrl(null)).toBe(false);
    expect(isValidApprovalUrl(undefined)).toBe(false);
    expect(isValidApprovalUrl("not-a-url")).toBe(false);
    expect(isValidApprovalUrl("ftp://example.com")).toBe(false);
  });
});
