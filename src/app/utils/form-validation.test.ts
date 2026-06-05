import { describe, expect, it } from "vitest";
import {
  confirmPasswordRules,
  emailRules,
  normalizeEmailInput,
  normalizePhoneInput,
  normalizeRequiredTextInput,
  normalizeTagListInput,
  optionalTrimmedTextRules,
  passwordRules,
  phoneRules,
  trimmedTextRules,
} from "./form-validation";

describe("form-validation", () => {
  it("normalizes text and email inputs", () => {
    expect(normalizeRequiredTextInput("  hello  ")).toBe("hello");
    expect(normalizeEmailInput("  TeSt@Example.COM  ")).toBe("test@example.com");
    expect(normalizePhoneInput(" +1 (415) 555-0101 ")).toBe("+14155550101");
  });

  it("normalizes comma-delimited tags", () => {
    expect(normalizeTagListInput(" bio,  anatomy , , quiz ")).toEqual(["bio", "anatomy", "quiz"]);
  });

  it("enforces trimmed text rules", () => {
    const rules = trimmedTextRules({
      requiredMessage: "Required",
      minLength: 3,
      minLengthMessage: "Too short",
      maxLength: 5,
      maxLengthMessage: "Too long",
    });

    expect(rules.validate.requiredTrimmed("   ")).toBe("Required");
    expect(rules.validate.minLengthTrimmed(" aa ")).toBe("Too short");
    expect(rules.validate.maxLengthTrimmed(" 123456 ")).toBe("Too long");
    expect(rules.validate.maxLengthTrimmed(" 12345 ")).toBe(true);
  });

  it("enforces optional max-length rules", () => {
    const rules = optionalTrimmedTextRules({ maxLength: 4, maxLengthMessage: "Max" });
    expect(rules.validate.maxLengthTrimmed(" 12345 ")).toBe("Max");
    expect(rules.validate.maxLengthTrimmed(" 1234 ")).toBe(true);
  });

  it("validates email rules", () => {
    const rules = emailRules();
    expect(rules.validate.requiredTrimmed("   ")).toBe("Email is required.");
    expect(rules.validate.emailFormat("invalid-email")).toBe("Please enter a valid email address.");
    expect(rules.validate.emailFormat("ok@test.com")).toBe(true);
  });

  it("validates phone rules", () => {
    const rules = phoneRules();
    expect(rules.validate.requiredTrimmed("   ")).toBe("Phone number is required.");
    expect(rules.validate.phoneFormat("123")).toBe("Please enter a valid phone number.");
    expect(rules.validate.phoneFormat("+1 (415) 555-0101")).toBe(true);
  });

  it("validates password and confirm-password rules", () => {
    const pwdRules = passwordRules({ requiredMessage: "Password required" });
    expect(pwdRules.validate.requiredTrimmed("   ")).toBe("Password required");
    expect(pwdRules.minLength.value).toBe(8);

    const confirmRules = confirmPasswordRules(() => "secret123", {
      requiredMessage: "Confirm required",
      mismatchMessage: "No match",
    });
    expect(confirmRules.validate.requiredTrimmed("   ")).toBe("Confirm required");
    expect(confirmRules.validate.matchesPassword("secret123")).toBe(true);
    expect(confirmRules.validate.matchesPassword("other")).toBe("No match");
  });
});
