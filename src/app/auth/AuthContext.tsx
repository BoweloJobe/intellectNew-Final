import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  signIn as signInService,
  signInWithProvider as signInWithProviderService,
  signOut as signOutService,
  signUp as signUpService,
  type AuthRole,
  type AuthSession,
  type AuthUser,
  type SignInWithProviderInput,
  type SignInWithProviderResult,
  type SignInInput,
  type SignInResult,
  type SignUpInput,
  type SignUpResult,
} from "../../services/auth";
import { normalizeAuthSession, normalizeAuthUser, normalizeEmail } from "./auth-normalizers";
import { getCurrentSubscriptionStatus } from "../services/subscription.service";
import {
  AUTH_SESSION_CLEARED_EVENT,
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession,
} from "./auth-storage";
import { logError, logInfo, logWarn } from "../utils/logger";
import { invalidateSearchCatalog } from "../utils/search";
import { clearPersistedProductState } from "../services/product-storage.service";
import type { SubscriptionOverview } from "../models/subscription";

export type AuthStatus = "restoring" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  role: AuthRole | null;
  subscription: {
    tier: "free" | "pro";
    activePlanId: "free" | "pro";
    status: "free" | "checkout-pending" | "verification-pending" | "active" | "expiring" | "expired" | "canceled";
    hasProAccess: boolean;
    billingCycle: "monthly" | "annual" | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    nextBillingDate: string | null;
    pendingPlanChange: {
      planId: "free" | "pro";
      billingCycle: "monthly" | "annual";
      effectiveAt: string;
    } | null;
    providerMetadata: {
      provider: "paypal";
      checkoutSessionId: string | null;
    } | null;
    lastUpgradeAt: string | null;
    lastVerifiedAt: string | null;
  };
  loading: boolean;
  signIn: (input: SignInInput) => Promise<SignInResult>;
  signInWithProvider: (input: SignInWithProviderInput) => Promise<SignInWithProviderResult>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  updateCurrentUserProfile: (input: {
    firstName: string;
    lastName: string;
    email: string;
    institution: string;
    bio: string;
  }) => void;
  applyVerifiedSubscriptionStatus: (result: SubscriptionOverview) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

function createSubscriptionOverviewFromTier(
  tier: "free" | "pro",
  previous: SubscriptionOverview | null = null,
): SubscriptionOverview {
  const isPro = tier === "pro";

  return {
    tier,
    activePlanId: isPro ? "pro" : "free",
    status: isPro ? "active" : "free",
    hasProAccess: isPro,
    billingCycle: isPro ? "monthly" : null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    nextBillingDate: previous?.nextBillingDate ?? null,
    pendingPlanChange: previous?.pendingPlanChange ?? null,
    providerMetadata: previous?.providerMetadata ?? null,
    lastUpgradeAt: previous?.lastUpgradeAt ?? null,
    lastVerifiedAt: previous?.lastVerifiedAt ?? null,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [subscriptionOverview, setSubscriptionOverview] = useState<SubscriptionOverview>(
    createSubscriptionOverviewFromTier("free"),
  );

  useEffect(() => {
    const handleSessionCleared = () => {
      setUser(null);
      setSession(null);
      setStatus("unauthenticated");
      setSubscriptionOverview(createSubscriptionOverviewFromTier("free"));
      clearPersistedProductState();
      invalidateSearchCatalog();
    };

    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);

    return () => {
      window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);
    };
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      setStatus("restoring");
      const storedSession = readStoredAuthSession();

      if (!storedSession) {
        setUser(null);
        setSession(null);
        setStatus("unauthenticated");
        return;
      }

      // Require a real access token before attempting to restore the session.
      // Sessions stored by the mock adapter do not carry tokens (mock sign-in
      // returns no JWT), so they cannot be verified server-side.  Trusting a
      // token-free session would silently resurrect stale mock/fake identities
      // across browser refreshes.  Clear such sessions immediately.
      if (!storedSession.tokens?.accessToken) {
        logInfo("Stored auth session has no access token — clearing", {
          reason: "no_access_token",
        });
        clearStoredAuthSession();
        setUser(null);
        setSession(null);
        setStatus("unauthenticated");
        return;
      }

      try {
        const resolvedUser = await getCurrentUser({ session: storedSession });

        if (!resolvedUser) {
          logInfo("Stored auth session is no longer valid", {
            reason: "resolved_user_missing",
          });
          clearStoredAuthSession();
          setUser(null);
          setSession(null);
          setStatus("unauthenticated");
          return;
        }

        const normalizedSession = normalizeAuthSession({
          ...storedSession,
          user: resolvedUser,
        });

        writeStoredAuthSession(normalizedSession);
        setUser(normalizedSession.user);
        setSession(normalizedSession);
        setSubscriptionOverview(createSubscriptionOverviewFromTier(
          normalizedSession.user.subscriptionTier === "pro" ? "pro" : "free",
        ));
        setStatus("authenticated");
        logInfo("Auth session restored", {
          userId: normalizedSession.user.id,
          role: normalizedSession.user.role,
        });
      } catch (error) {
        logWarn("Auth session restoration failed", {
          error,
        });
        clearStoredAuthSession();
        setUser(null);
        setSession(null);
        setStatus("unauthenticated");
      }
    };

    void restoreSession();
  }, []);

  const signIn = useCallback(async (input: SignInInput): Promise<SignInResult> => {
    const normalizedInput: SignInInput = {
      ...input,
      email: normalizeEmail(input.email),
    };

    const result = await signInService(normalizedInput);

    if (result.ok) {
      const normalizedUser = normalizeAuthUser(result.user);
      const normalizedSession = normalizeAuthSession(result.session ?? { user: normalizedUser });

      setUser(normalizedUser);
      setSession(normalizedSession);
      setStatus("authenticated");
      setSubscriptionOverview(createSubscriptionOverviewFromTier(
        normalizedUser.subscriptionTier === "pro" ? "pro" : "free",
      ));
      writeStoredAuthSession(normalizedSession);
      logInfo("User signed in", {
        userId: normalizedUser.id,
        role: normalizedUser.role,
      });
    } else {
      logWarn("Sign-in failed", {
        reason: result.message,
      });
    }

    return result;
  }, []);

  const signUp = useCallback(async (input: SignUpInput): Promise<SignUpResult> => {
    const normalizedInput: SignUpInput = {
      ...input,
      email: normalizeEmail(input.email),
    };

    const result = await signUpService(normalizedInput);

    if (result.ok) {
      const normalizedUser = normalizeAuthUser(result.user);
      const normalizedSession = normalizeAuthSession(result.session ?? { user: normalizedUser });

      setUser(normalizedUser);
      setSession(normalizedSession);
      setStatus("authenticated");
      setSubscriptionOverview(createSubscriptionOverviewFromTier(
        normalizedUser.subscriptionTier === "pro" ? "pro" : "free",
      ));
      writeStoredAuthSession(normalizedSession);
      logInfo("User signed up", {
        userId: normalizedUser.id,
        role: normalizedUser.role,
      });
    } else {
      logWarn("Sign-up failed", {
        reason: result.message,
      });
    }

    return result;
  }, []);

  const signInWithProvider = useCallback(async (
    input: SignInWithProviderInput,
  ): Promise<SignInWithProviderResult> => {
    const result = await signInWithProviderService(input);

    if (!result.ok) {
      logWarn("Provider sign-in failed", {
        provider: input.provider,
        reason: result.message,
      });
      return result;
    }

    if (result.user) {
      const normalizedUser = normalizeAuthUser(result.user);
      const normalizedSession = normalizeAuthSession(result.session ?? { user: normalizedUser });

      setUser(normalizedUser);
      setSession(normalizedSession);
      setStatus("authenticated");
      setSubscriptionOverview(createSubscriptionOverviewFromTier(
        normalizedUser.subscriptionTier === "pro" ? "pro" : "free",
      ));
      writeStoredAuthSession(normalizedSession);
      logInfo("User signed in with provider", {
        provider: input.provider,
        userId: normalizedUser.id,
        role: normalizedUser.role,
      });
    } else {
      logInfo("Provider sign-in started", {
        provider: input.provider,
        requiresRedirect: result.requiresRedirect,
      });
    }

    return result;
  }, []);

  const signOut = useCallback(() => {
    const currentUserId = user?.id ?? null;

    setUser(null);
    setSession(null);
    setStatus("unauthenticated");
    setSubscriptionOverview(createSubscriptionOverviewFromTier("free"));
    clearStoredAuthSession();
    clearPersistedProductState();
    invalidateSearchCatalog();
    logInfo("User signed out", {
      userId: currentUserId,
    });

    void signOutService().catch((error) => {
      logError("Sign-out request failed", {
        error,
      });
    });
  }, [user?.id]);

  const updateCurrentUserProfile = useCallback((input: {
    firstName: string;
    lastName: string;
    email: string;
    institution: string;
    bio: string;
  }) => {
    setUser((previousUser) => {
      if (!previousUser) {
        return previousUser;
      }

      const updatedUser = normalizeAuthUser({
        ...previousUser,
        firstName: input.firstName,
        lastName: input.lastName,
        displayName: input.firstName,
        fullName: `${input.firstName} ${input.lastName}`.trim(),
        email: input.email,
        institution: input.institution,
        bio: input.bio,
        learningGoal: input.bio,
      });

      setSession((previousSession) => {
        if (!previousSession) {
          return previousSession;
        }

        const updatedSession = normalizeAuthSession({
          ...previousSession,
          user: updatedUser,
        });

        writeStoredAuthSession(updatedSession);
        return updatedSession;
      });

      return updatedUser;
    });
  }, []);

  const isAuthenticated = status === "authenticated" && Boolean(user);
  const loading = status === "restoring";

  const applyVerifiedSubscriptionStatus = useCallback((nextOverview: SubscriptionOverview) => {
    setSubscriptionOverview(nextOverview);

    setUser((previousUser) => {
      if (!previousUser) {
        return previousUser;
      }

      const effectiveTier: "free" | "pro" = nextOverview.hasProAccess ? "pro" : "free";

      if (previousUser.subscriptionTier === effectiveTier) {
        return previousUser;
      }

      const upgradedUser = normalizeAuthUser({
        ...previousUser,
        subscriptionTier: effectiveTier,
      });

      const upgradedSession = normalizeAuthSession({
        user: upgradedUser,
        tokens: session?.tokens,
      });

      setSession(upgradedSession);
      writeStoredAuthSession(upgradedSession);

      logInfo("Verified subscription state applied to auth session", {
        userId: upgradedUser.id,
        upgradedTier: effectiveTier,
        status: nextOverview.status,
      });

      return upgradedUser;
    });
  }, [session?.tokens]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isCancelled = false;

    void getCurrentSubscriptionStatus({
      userId: user.id,
      currentTier: user.subscriptionTier === "pro" ? "pro" : "free",
    })
      .then((currentSubscription) => {
        if (isCancelled) {
          return;
        }

        applyVerifiedSubscriptionStatus(currentSubscription);
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        logWarn("Unable to refresh subscription state", {
          userId: user.id,
          error,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [applyVerifiedSubscriptionStatus, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      status,
      isAuthenticated,
      role: user?.role ?? null,
      subscription: {
        tier: subscriptionOverview.tier,
        activePlanId: subscriptionOverview.activePlanId,
        status: subscriptionOverview.status,
        hasProAccess: subscriptionOverview.hasProAccess,
        billingCycle: subscriptionOverview.billingCycle,
        currentPeriodStart: subscriptionOverview.currentPeriodStart,
        currentPeriodEnd: subscriptionOverview.currentPeriodEnd,
        nextBillingDate: subscriptionOverview.nextBillingDate,
        pendingPlanChange: subscriptionOverview.pendingPlanChange,
        providerMetadata: subscriptionOverview.providerMetadata,
        lastUpgradeAt: subscriptionOverview.lastUpgradeAt,
        lastVerifiedAt: subscriptionOverview.lastVerifiedAt,
      },
      loading,
      signIn,
      signInWithProvider,
      signUp,
      updateCurrentUserProfile,
      applyVerifiedSubscriptionStatus,
      signOut,
    }),
    [applyVerifiedSubscriptionStatus, isAuthenticated, loading, session, signIn, signInWithProvider, signOut, signUp, status, subscriptionOverview, updateCurrentUserProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
