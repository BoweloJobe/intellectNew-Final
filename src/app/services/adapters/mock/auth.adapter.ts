import type {
  AuthService,
  AuthSession,
  AuthUser,
  ChangePasswordInput,
  ChangePasswordResult,
  OAuthProvider,
  PasswordResetChannel,
  ResetPasswordInput,
  ResetPasswordResult,
  SignInWithProviderInput,
  SignInWithProviderResult,
  SendPasswordResetCodeInput,
  SendPasswordResetCodeResult,
  SignInInput,
  SignInResult,
  SignUpInput,
  SignUpResult,
  UpdateProfileInput,
  UpdateProfileResult,
  VerifyPasswordResetCodeInput,
  VerifyPasswordResetCodeResult,
} from "../../contracts/auth.contract";

const DEMO_PASSWORD = "password123";
let activeDemoPassword = DEMO_PASSWORD;
const RESET_CODE_LENGTH = 6;
const MAX_RESET_CODE_ATTEMPTS = 5;

type MockPasswordResetChallenge = {
  id: string;
  channel: PasswordResetChannel;
  destination: string;
  code: string;
  verificationToken: string | null;
  attemptsUsed: number;
  consumed: boolean;
};

const DEMO_USERS: Record<string, AuthUser> = {
  "demo@intellectx.com": {
    id: "student-demo",
    firstName: "Sarah",
    lastName: "Johnson",
    displayName: "Sarah",
    fullName: "Sarah Johnson",
    email: "demo@intellectx.com",
    role: "student",
    subscriptionTier: "free",
    institution: "Stanford University",
    learningGoal: "Master biology fundamentals",
  },
  "instructor@intellectx.com": {
    id: "instructor-demo",
    firstName: "Emily",
    lastName: "Roberts",
    displayName: "Dr. Emily",
    fullName: "Dr. Emily Roberts",
    email: "instructor@intellectx.com",
    role: "instructor",
    subscriptionTier: "pro",
    institution: "IntellectX Faculty",
    learningGoal: "Guide students through advanced courses",
  },
  "admin@intellectx.com": {
    id: "admin-demo",
    firstName: "Alex",
    lastName: "Rivera",
    displayName: "Alex",
    fullName: "Alex Rivera",
    email: "admin@intellectx.com",
    role: "admin",
    subscriptionTier: "pro",
    institution: "IntellectX",
  },
};

const PROVIDER_DEMO_EMAIL: Record<OAuthProvider, string> = {
  google: "demo@intellectx.com",
  outlook: "instructor@intellectx.com",
};

const passwordResetChallenges = new Map<string, MockPasswordResetChallenge>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeResetDestination(channel: PasswordResetChannel, destination: string): string {
  if (channel === "email") {
    return destination.trim().toLowerCase();
  }

  const trimmed = destination.trim();
  const hasPlusPrefix = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return digits.length === 0 ? "" : `${hasPlusPrefix ? "+" : ""}${digits}`;
}

function maskDestination(channel: PasswordResetChannel, destination: string): string {
  if (channel === "email") {
    const [localPart = "", domainPart = ""] = destination.split("@");
    const visibleLocal = localPart.slice(0, 2);
    const maskedLocal = `${visibleLocal}${"*".repeat(Math.max(localPart.length - 2, 1))}`;

    if (!domainPart) {
      return maskedLocal;
    }

    return `${maskedLocal}@${domainPart}`;
  }

  const digits = destination.replace(/\D/g, "");

  if (digits.length <= 4) {
    return `***${digits}`;
  }

  return `***-***-${digits.slice(-4)}`;
}

function buildResetCode(): string {
  const lowerBound = 10 ** (RESET_CODE_LENGTH - 1);
  const upperBound = (10 ** RESET_CODE_LENGTH) - 1;
  return String(Math.floor(Math.random() * (upperBound - lowerBound + 1)) + lowerBound);
}

export class MockAuthAdapter implements AuthService {
  async signIn(input: SignInInput): Promise<SignInResult> {
    await delay(800);

    const normalizedEmail = input.email.trim().toLowerCase();
    const matchedUser = DEMO_USERS[normalizedEmail];

    if (matchedUser && input.password === activeDemoPassword) {
      return { ok: true, user: matchedUser };
    }

    return {
      ok: false,
      message:
        "Invalid email or password. Try demo@intellectx.com, instructor@intellectx.com, or admin@intellectx.com with password123.",
    };
  }

  async signInWithProvider(input: SignInWithProviderInput): Promise<SignInWithProviderResult> {
    await delay(650);

    const demoEmail = PROVIDER_DEMO_EMAIL[input.provider];
    const matchedUser = DEMO_USERS[demoEmail];

    if (!matchedUser) {
      return {
        ok: false,
        message: "No mock account configured for this provider.",
      };
    }

    return {
      ok: true,
      requiresRedirect: false,
      user: matchedUser,
      message: `Mock ${input.provider} login successful.`,
    };
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    await delay(900);

    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedFirstName = input.firstName.trim();
    const normalizedLastName = input.lastName.trim();
    const normalizedRole = input.role ?? "student";

    if (normalizedEmail.endsWith("@example.com")) {
      return {
        ok: false,
        message: "Please use a non-example email address.",
      };
    }

    if (DEMO_USERS[normalizedEmail]) {
      return {
        ok: false,
        message: "An account with this email already exists.",
      };
    }

    return {
      ok: true,
      user: {
        id: `user-${Date.now()}`,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        displayName: normalizedFirstName,
        fullName: `${normalizedFirstName} ${normalizedLastName}`.trim(),
        email: normalizedEmail,
        role: normalizedRole,
        subscriptionTier: "free",
      },
    };
  }

  async sendPasswordResetCode(
    input: SendPasswordResetCodeInput,
  ): Promise<SendPasswordResetCodeResult> {
    await delay(700);

    const normalizedDestination = normalizeResetDestination(input.channel, input.destination);

    if (!normalizedDestination) {
      return {
        ok: false,
        message: "Enter a valid email address or phone number.",
      };
    }

    const challengeId = `reset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const verificationToken = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const resetCode = buildResetCode();
    // eslint-disable-next-line no-console
    console.info(`[Demo] Password reset code for ${normalizedDestination}: ${resetCode}`);

    passwordResetChallenges.set(challengeId, {
      id: challengeId,
      channel: input.channel,
      destination: normalizedDestination,
      code: resetCode,
      verificationToken,
      attemptsUsed: 0,
      consumed: false,
    });

    return {
      ok: true,
      challengeId,
      channel: input.channel,
      maskedDestination: maskDestination(input.channel, normalizedDestination),
      resendAfterSeconds: 30,
    };
  }

  async verifyPasswordResetCode(
    input: VerifyPasswordResetCodeInput,
  ): Promise<VerifyPasswordResetCodeResult> {
    await delay(550);

    const challenge = passwordResetChallenges.get(input.challengeId);

    if (!challenge || challenge.consumed) {
      return {
        ok: false,
        message: "This reset session has expired. Request a new code and try again.",
      };
    }

    const enteredCode = input.code.trim();

    if (enteredCode !== challenge.code) {
      challenge.attemptsUsed += 1;
      const remainingAttempts = Math.max(MAX_RESET_CODE_ATTEMPTS - challenge.attemptsUsed, 0);

      if (remainingAttempts === 0) {
        passwordResetChallenges.delete(input.challengeId);

        return {
          ok: false,
          message: "Too many incorrect attempts. Request a new code to continue.",
          remainingAttempts,
        };
      }

      return {
        ok: false,
        message: "Invalid verification code. Please try again.",
        remainingAttempts,
      };
    }

    return {
      ok: true,
      verificationToken: challenge.verificationToken ?? "",
      remainingAttempts: Math.max(MAX_RESET_CODE_ATTEMPTS - challenge.attemptsUsed, 0),
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
    await delay(700);

    const challenge = passwordResetChallenges.get(input.challengeId);

    if (!challenge || challenge.consumed) {
      return {
        ok: false,
        message: "This reset session has expired. Start over and request a new code.",
      };
    }

    if (challenge.verificationToken !== input.verificationToken) {
      return {
        ok: false,
        message: "Your verification session is invalid. Please verify your code again.",
      };
    }

    if (input.newPassword.trim().length < 8) {
      return {
        ok: false,
        message: "Password must be at least 8 characters.",
      };
    }

    challenge.consumed = true;
    passwordResetChallenges.delete(input.challengeId);

    return {
      ok: true,
      message: "Password updated successfully.",
    };
  }

  async updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
    await delay(350);

    const normalizedFirstName = input.firstName.trim();
    const normalizedLastName = input.lastName.trim();
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedBio = input.bio?.trim() || undefined;
    const normalizedInstitution = input.institution?.trim() || undefined;

    return {
      ok: true,
      user: {
        id: `user-${Date.now()}`,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        displayName: normalizedFirstName,
        fullName: `${normalizedFirstName} ${normalizedLastName}`.trim(),
        email: normalizedEmail,
        role: 'student',
        subscriptionTier: 'free',
        institution: normalizedInstitution,
        learningGoal: normalizedBio,
        bio: normalizedBio,
      },
    };
  }

  async changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
    await delay(350);

    if (input.currentPassword !== activeDemoPassword) {
      return { ok: false, message: "Current password is incorrect." };
    }

    if (input.newPassword.trim().length < 8) {
      return { ok: false, message: "Password must be at least 8 characters." };
    }

    if (input.newPassword !== input.confirmPassword) {
      return { ok: false, message: "Passwords do not match." };
    }

    if (input.newPassword === input.currentPassword) {
      return { ok: false, message: "New password must be different from current password." };
    }

    activeDemoPassword = input.newPassword;
    return { ok: true, message: "Password updated successfully." };
  }

  async signOut(): Promise<void> {
    await delay(120);
  }

  async getCurrentUser(input?: { session?: AuthSession | null }): Promise<AuthUser | null> {
    await delay(120);

    const sessionUser = input?.session?.user;

    if (!sessionUser) {
      return null;
    }

    return {
      ...sessionUser,
      email: sessionUser.email.trim().toLowerCase(),
    };
  }
}
