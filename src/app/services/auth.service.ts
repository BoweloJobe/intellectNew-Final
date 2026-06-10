import { getAuthService } from "./factory/service-registry";
import type {
  AuthSession,
  AuthUser,
  ChangePasswordInput,
  ChangePasswordResult,
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
} from "./contracts/auth.contract";

export async function signIn(input: SignInInput): Promise<SignInResult> {
  return getAuthService().signIn(input);
}

export async function signInWithProvider(
  input: SignInWithProviderInput,
): Promise<SignInWithProviderResult> {
  return getAuthService().signInWithProvider(input);
}

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  return getAuthService().signUp(input);
}

export async function sendPasswordResetCode(
  input: SendPasswordResetCodeInput,
): Promise<SendPasswordResetCodeResult> {
  return getAuthService().sendPasswordResetCode(input);
}

export async function verifyPasswordResetCode(
  input: VerifyPasswordResetCodeInput,
): Promise<VerifyPasswordResetCodeResult> {
  return getAuthService().verifyPasswordResetCode(input);
}

export async function resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResult> {
  return getAuthService().resetPassword(input);
}

export async function signOut(): Promise<void> {
  await getAuthService().signOut();
}

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  return getAuthService().updateProfile(input);
}

export async function changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
  return getAuthService().changePassword(input);
}

export async function getCurrentUser(input?: { session?: AuthSession | null }): Promise<AuthUser | null> {
  return getAuthService().getCurrentUser(input);
}
