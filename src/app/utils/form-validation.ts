export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;
export const MIN_PASSWORD_LENGTH = 8;

export function normalizeRequiredTextInput(value: string): string {
  return value.trim();
}

export function normalizeEmailInput(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhoneInput(value: string): string {
  const trimmed = value.trim();
  const hasPlusPrefix = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return `${hasPlusPrefix ? "+" : ""}${digits}`;
}

export function isNonEmptyTrimmed(value: string): boolean {
  return value.trim().length > 0;
}

export function normalizeTagListInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

type TextRuleOptions = {
  requiredMessage: string;
  minLength?: number;
  minLengthMessage?: string;
  maxLength?: number;
  maxLengthMessage?: string;
};

export function trimmedTextRules(options: TextRuleOptions) {
  return {
    required: options.requiredMessage,
    validate: {
      requiredTrimmed: (value: string) => {
        if (typeof value !== "string") {
          return options.requiredMessage;
        }

        return isNonEmptyTrimmed(value) || options.requiredMessage;
      },
      minLengthTrimmed: (value: string) => {
        if (typeof value !== "string" || options.minLength === undefined) {
          return true;
        }

        if (value.trim().length >= options.minLength) {
          return true;
        }

        return options.minLengthMessage ?? `Must be at least ${options.minLength} characters.`;
      },
      maxLengthTrimmed: (value: string) => {
        if (typeof value !== "string" || options.maxLength === undefined) {
          return true;
        }

        if (value.trim().length <= options.maxLength) {
          return true;
        }

        return options.maxLengthMessage ?? `Must be at most ${options.maxLength} characters.`;
      },
    },
  };
}

type OptionalTextRuleOptions = {
  maxLength?: number;
  maxLengthMessage?: string;
};

export function optionalTrimmedTextRules(options: OptionalTextRuleOptions) {
  return {
    validate: {
      maxLengthTrimmed: (value: string) => {
        if (typeof value !== "string" || options.maxLength === undefined) {
          return true;
        }

        if (value.trim().length <= options.maxLength) {
          return true;
        }

        return options.maxLengthMessage ?? `Must be at most ${options.maxLength} characters.`;
      },
    },
  };
}

type EmailRuleOptions = {
  requiredMessage?: string;
  invalidMessage?: string;
};

export function emailRules(options: EmailRuleOptions = {}) {
  const requiredMessage = options.requiredMessage ?? "Email is required.";
  const invalidMessage = options.invalidMessage ?? "Please enter a valid email address.";

  return {
    required: requiredMessage,
    validate: {
      requiredTrimmed: (value: string) => {
        if (typeof value !== "string") {
          return requiredMessage;
        }

        return isNonEmptyTrimmed(value) || requiredMessage;
      },
      emailFormat: (value: string) => {
        if (typeof value !== "string") {
          return invalidMessage;
        }

        return EMAIL_PATTERN.test(normalizeEmailInput(value)) || invalidMessage;
      },
    },
  };
}

type PasswordRuleOptions = {
  requiredMessage: string;
  minLength?: number;
  minLengthMessage?: string;
};

export function passwordRules(options: PasswordRuleOptions) {
  const minLength = options.minLength ?? MIN_PASSWORD_LENGTH;

  return {
    required: options.requiredMessage,
    minLength: {
      value: minLength,
      message: options.minLengthMessage ?? `Password must be at least ${minLength} characters.`,
    },
    validate: {
      requiredTrimmed: (value: string) => {
        if (typeof value !== "string") {
          return options.requiredMessage;
        }

        return isNonEmptyTrimmed(value) || options.requiredMessage;
      },
    },
  };
}

type ConfirmPasswordRuleOptions = {
  requiredMessage: string;
  mismatchMessage: string;
};

export function confirmPasswordRules(
  getPassword: () => string,
  options: ConfirmPasswordRuleOptions,
) {
  return {
    required: options.requiredMessage,
    validate: {
      requiredTrimmed: (value: string) => {
        if (typeof value !== "string") {
          return options.requiredMessage;
        }

        return isNonEmptyTrimmed(value) || options.requiredMessage;
      },
      matchesPassword: (value: string) => value === getPassword() || options.mismatchMessage,
    },
  };
}

type PhoneRuleOptions = {
  requiredMessage?: string;
  invalidMessage?: string;
};

export function phoneRules(options: PhoneRuleOptions = {}) {
  const requiredMessage = options.requiredMessage ?? "Phone number is required.";
  const invalidMessage = options.invalidMessage ?? "Please enter a valid phone number.";

  return {
    required: requiredMessage,
    validate: {
      requiredTrimmed: (value: string) => {
        if (typeof value !== "string") {
          return requiredMessage;
        }

        return isNonEmptyTrimmed(value) || requiredMessage;
      },
      phoneFormat: (value: string) => {
        if (typeof value !== "string") {
          return invalidMessage;
        }

        return PHONE_PATTERN.test(normalizePhoneInput(value)) || invalidMessage;
      },
    },
  };
}