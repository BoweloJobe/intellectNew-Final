import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncFormSubmission } from "../hooks/useAsyncFormSubmission";
import { Button } from "../components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { useAuth } from "../auth/AuthContext";
import { resolveSafeLoginDestination } from "../auth/route-utils";
import { emailRules, normalizeEmailInput, passwordRules } from "../utils/form-validation";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithProvider } = useAuth();
  const { isSubmitting, submitError, submitSuccess, clearStatus, run } = useAsyncFormSubmission();
  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? null;

  const completeLogin = (role: "student" | "instructor" | "admin") => {
    const safeDestination = resolveSafeLoginDestination(redirectPath, role);

    window.setTimeout(() => {
      navigate(safeDestination, { replace: true });
    }, 450);
  };

  const handleProviderSignIn = async (provider: "google" | "outlook") => {
    clearStatus();

    const result = await run(
      async () => {
        const providerResult = await signInWithProvider({ provider });

        if (!providerResult.ok) {
          throw new Error(providerResult.message);
        }

        return providerResult;
      },
      {
        successMessage: provider === "google"
          ? "Google sign-in ready."
          : "Outlook / Student Email sign-in ready.",
        onSuccess: async (result) => {
          if (result.requiresRedirect && result.authorizationUrl) {
            window.location.assign(result.authorizationUrl);
            return;
          }

          if (result.user) {
            completeLogin(result.user.role);
          }
        },
      },
    );

    if (!result) {
      form.setError("email", {
        message: "Provider sign-in is currently unavailable. Try email/password.",
      });
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    clearStatus();
    const result = await run(
      async () => {
        const signInResult = await signIn({
          email: normalizeEmailInput(values.email),
          password: values.password,
        });

        if (!signInResult.ok) {
          throw new Error(signInResult.message);
        }

        return signInResult;
      },
      {
        successMessage: "Signed in successfully. Redirecting...",
        onSuccess: async (result) => {
          completeLogin(result.user.role);
        },
      },
    );

    if (!result) {
      form.setError("password", { message: "Check your credentials and try again." });
    }
  });

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold mb-3 text-gray-900">Welcome Back</h1>
          <p className="text-gray-700">Sign in to continue your learning journey</p>
        </div>

        <Form {...form}>
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <FormField
              control={form.control}
              name="email"
              rules={{
                ...emailRules(),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold text-gray-900">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      className="bg-white/[0.45]"
                      autoComplete="email"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(event) => {
                        clearStatus();
                        field.onChange(event);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              rules={{
                ...passwordRules({ requiredMessage: "Password is required." }),
              }}
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="font-semibold text-gray-900">Password</FormLabel>
                    <Link to="/forgot-password" className="text-xs font-semibold text-[#4a9ff5] hover:text-[#2e8ef7]">
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      className="bg-white/[0.45]"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(event) => {
                        clearStatus();
                        field.onChange(event);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError ? (
              <DataErrorState title="Sign-in failed" description={submitError} />
            ) : null}

            {submitSuccess ? <ActionSuccessState message={submitSuccess} /> : null}

            <Button
              type="submit"
              className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white/[0.45] text-gray-600">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                className="bg-white/[0.45]"
                disabled={isSubmitting}
                onClick={() => {
                  void handleProviderSignIn("google");
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="bg-white/[0.45]"
                disabled={isSubmitting}
                onClick={() => {
                  void handleProviderSignIn("outlook");
                }}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#0A5FB4" d="M13 3h8v8h-8z" />
                  <path fill="#0078D4" d="M3 6.5l9-1.5v14l-9-1.5z" />
                  <path fill="#2B88D8" d="M13 11h8v10h-8z" />
                  <path fill="#185ABD" d="M13 3l8 8-8 0z" opacity="0.9" />
                </svg>
                Outlook / Student Email
              </Button>
            </div>
          </form>
        </Form>

        <p className="text-center mt-6 text-gray-700">
          Don't have an account?{" "}
          <Link to="/signup" className="text-[#4a9ff5] hover:text-[#2e8ef7] font-medium">
            Sign up
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
