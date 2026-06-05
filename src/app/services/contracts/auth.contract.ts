export type SignInInput = {
  email: string;
  password: string;
};

export type OAuthProvider = "google" | "outlook";

export type SignInWithProviderInput = {
  provider: OAuthProvider;
  redirectTo?: string;
};

export type PasswordResetChannel = "email" | "phone";

export type AuthRole = "student" | "instructor" | "admin";
export type SubscriptionTier = "free" | "pro";

export type SignUpRole = Exclude<AuthRole, "admin">;

export type AuthUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  fullName: string;
  email: string;
  role: AuthRole;
  subscriptionTier?: SubscriptionTier;
  institution?: string;
  learningGoal?: string;
};

export type AuthSessionTokens = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  sessionId?: string;
};

export type AuthSession = {
  user: AuthUser;
  tokens?: AuthSessionTokens;
};

export type SignUpInput = {
  firstName: string;
  lastName: string;
  displayName: string;
  fullName: string;
  email: string;
  password: string;
  role?: SignUpRole;
  institution?: string;
  learningGoal?: string;
};

export type SignInResult =
  | { ok: true; user: AuthUser; session?: AuthSession }
  | { ok: false; message: string };

export type SignInWithProviderResult =
  | {
      ok: true;
      requiresRedirect: boolean;
      authorizationUrl?: string;
      user?: AuthUser;
      session?: AuthSession;
      message?: string;
    }
  | { ok: false; message: string };

export type SignUpResult =
  | { ok: true; user: AuthUser; session?: AuthSession }
  | { ok: false; message: string };

export type SendPasswordResetCodeInput = {
  channel: PasswordResetChannel;
  destination: string;
};

export type SendPasswordResetCodeResult =
  | {
      ok: true;
      challengeId: string;
      channel: PasswordResetChannel;
      maskedDestination: string;
      resendAfterSeconds: number;
    }
  | { ok: false; message: string };

export type VerifyPasswordResetCodeInput = {
  challengeId: string;
  code: string;
};

export type VerifyPasswordResetCodeResult =
  | {
      ok: true;
      verificationToken: string;
      remainingAttempts: number;
    }
  | { ok: false; message: string; remainingAttempts?: number };

export type ResetPasswordInput = {
  challengeId: string;
  verificationToken: string;
  newPassword: string;
};

export type ResetPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export interface AuthService {
  signIn(input: SignInInput): Promise<SignInResult>;
  signInWithProvider(input: SignInWithProviderInput): Promise<SignInWithProviderResult>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  sendPasswordResetCode(input: SendPasswordResetCodeInput): Promise<SendPasswordResetCodeResult>;
  verifyPasswordResetCode(input: VerifyPasswordResetCodeInput): Promise<VerifyPasswordResetCodeResult>;
  resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult>;
  signOut(): Promise<void>;
  getCurrentUser(input?: { session?: AuthSession | null }): Promise<AuthUser | null>;
}