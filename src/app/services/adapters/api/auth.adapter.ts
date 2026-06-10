import type {
  AuthRole,
  AuthService,
  AuthSession,
  AuthUser,
  ResetPasswordInput,
  ResetPasswordResult,
  SendPasswordResetCodeInput,
  SendPasswordResetCodeResult,
  SignInInput,
  SignInResult,
  SignInWithProviderInput,
  SignInWithProviderResult,
  SignUpInput,
  SignUpResult,
  UpdateProfileInput,
  UpdateProfileResult,
  VerifyPasswordResetCodeInput,
  VerifyPasswordResetCodeResult,
} from "../../contracts/auth.contract";
import { httpClient, toApiError } from "../../../api";
import { readStoredAuthSession } from "../../../auth/auth-storage";

// ─── Backend Response Shapes ─────────────────────────────────────────────────

interface BackendUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // "STUDENT" | "INSTRUCTOR" | "ADMIN"
  avatarUrl: string | null;
  bio: string | null;
  institution: string | null;
  isVerified: boolean;
  createdAt: string;
}

interface BackendAuthResponse {
  status: string;
  data: {
    token: string;
    user: BackendUserProfile;
  };
}

interface BackendMeResponse {
  status: string;
  data: {
    user: BackendUserProfile;
  };
}

// ─── Shape Mappers ────────────────────────────────────────────────────────────

function mapRole(raw: string): AuthRole {
  switch (raw.toUpperCase()) {
    case "INSTRUCTOR":
      return "instructor";
    case "ADMIN":
      return "admin";
    default:
      return "student";
  }
}

function mapBackendUser(profile: BackendUserProfile): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayName: profile.firstName,
    fullName: `${profile.firstName} ${profile.lastName}`.trim(),
    role: mapRole(profile.role),
    // subscriptionTier is resolved by the subscription domain, not the auth endpoint
    subscriptionTier: "free",
    bio: profile.bio ?? undefined,
    institution: profile.institution ?? undefined,
    learningGoal: profile.bio ?? undefined,
  };
}

function buildSession(token: string, profile: BackendUserProfile): AuthSession {
  return {
    user: mapBackendUser(profile),
    tokens: {
      accessToken: token,
    },
  };
}

function getStoredToken(): string | undefined {
  return readStoredAuthSession()?.tokens?.accessToken;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class ApiAuthAdapter implements AuthService {
  async signIn(input: SignInInput): Promise<SignInResult> {
    try {
      const response = await httpClient.post<BackendAuthResponse, { email: string; password: string }>(
        "/auth/login",
        { body: { email: input.email, password: input.password }, auth: "none" },
      );

      const session = buildSession(response.data.token, response.data.user);
      return { ok: true, user: session.user, session };
    } catch (error) {
      const apiError = toApiError(error, { operation: "auth.signIn" });
      return { ok: false, message: apiError.message };
    }
  }

  async signInWithProvider(
    _input: SignInWithProviderInput,
  ): Promise<SignInWithProviderResult> {
    // OAuth provider login is not yet supported by the backend.
    return { ok: false, message: "Social sign-in is not available yet." };
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    try {
      const response = await httpClient.post<BackendAuthResponse, {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: "STUDENT" | "INSTRUCTOR";
      }>("/auth/signup", {
        body: {
          email: input.email,
          password: input.password,
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role === "instructor" ? "INSTRUCTOR" : "STUDENT",
        },
        auth: "none",
      });

      const session = buildSession(response.data.token, response.data.user);
      return { ok: true, user: session.user, session };
    } catch (error) {
      const apiError = toApiError(error, { operation: "auth.signUp" });
      return { ok: false, message: apiError.message };
    }
  }

  async updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
    const token = getStoredToken();
    if (!token) {
      return { ok: false, message: 'Authentication required' };
    }

    try {
      const response = await httpClient.patch<BackendMeResponse, UpdateProfileInput>(
        '/auth/me',
        {
          body: input,
        },
      );

      return { ok: true, user: mapBackendUser(response.data.user) };
    } catch (error) {
      const apiError = toApiError(error, { operation: 'auth.updateProfile' });
      return { ok: false, message: apiError.message };
    }
  }

  async getCurrentUser(input?: { session?: AuthSession | null }): Promise<AuthUser | null> {
    const token = input?.session?.tokens?.accessToken ?? getStoredToken();
    if (!token) {
      return null;
    }

    try {
      const response = await httpClient.get<BackendMeResponse>("/auth/me");

      return mapBackendUser(response.data.user);
    } catch (error) {
      const apiError = toApiError(error, { operation: "auth.getCurrentUser" });
      if (apiError.category === "http" && (apiError.status === 401 || apiError.status === 403)) {
        return null;
      }
      throw apiError;
    }
  }

  async signOut(): Promise<void> {
    const token = getStoredToken();
    try {
      if (!token) {
        return;
      }
      await httpClient.post<void>("/auth/logout");
    } catch {
      // Fire-and-forget: client-side state is already cleared before this resolves.
    }
  }

  /**
   * Sends a password reset email via the backend.
   * NOTE: The backend uses a URL-token flow (email link), not a 6-digit code.
   * The OTP verify step on the frontend will not work end-to-end until a
   * dedicated /reset-password?token=... page is added to the frontend.
   */
  async sendPasswordResetCode(
    input: SendPasswordResetCodeInput,
  ): Promise<SendPasswordResetCodeResult> {
    if (input.channel !== "email") {
      return { ok: false, message: "Only email-based password reset is supported." };
    }

    try {
      await httpClient.post<{ status: string }>("/auth/forgot-password/request", {
        body: { email: input.destination },
        auth: "none",
      });

      return {
        ok: true,
        challengeId: "email-token",
        channel: "email",
        maskedDestination: input.destination,
        resendAfterSeconds: 60,
      };
    } catch (error) {
      const apiError = toApiError(error, { operation: "auth.sendPasswordResetCode" });
      return { ok: false, message: apiError.message };
    }
  }

  /**
   * The backend does not have a code-verification step; the reset token
   * is delivered as a URL parameter in the reset email and is consumed
   * directly in the resetPassword call. This method accepts the input
   * and passes the code through as the verification token.
   */
  async verifyPasswordResetCode(
    input: VerifyPasswordResetCodeInput,
  ): Promise<VerifyPasswordResetCodeResult> {
    return {
      ok: true,
      verificationToken: input.code,
      remainingAttempts: 5,
    };
  }

  async resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
    try {
      await httpClient.post<{ status: string }>("/auth/forgot-password/reset", {
        body: { token: input.verificationToken, password: input.newPassword },
        auth: "none",
      });

      return { ok: true, message: "Your password has been reset. You can now sign in." };
    } catch (error) {
      const apiError = toApiError(error, { operation: "auth.resetPassword" });
      return { ok: false, message: apiError.message };
    }
  }
}
