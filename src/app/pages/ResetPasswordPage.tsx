import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { GlassCard } from "../components/GlassCard";
import { useAsyncFormSubmission } from "../hooks/useAsyncFormSubmission";
import { Button } from "../components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { confirmPasswordRules, passwordRules } from "../utils/form-validation";
import { resetPassword } from "../../services/auth";

type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [succeeded, setSucceeded] = useState(false);
  const { isSubmitting, submitError, clearStatus, run } = useAsyncFormSubmission();

  const form = useForm<ResetPasswordFormValues>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const handleReset = form.handleSubmit(async (values) => {
    clearStatus();

    const result = await run(
      async () => {
        const res = await resetPassword({
          challengeId: "email-token",
          verificationToken: token!,
          newPassword: values.password,
        });

        if (!res.ok) {
          throw new Error(res.message ?? "Password reset failed. The link may have expired.");
        }
      },
      {
        successMessage: "Password reset — redirecting to sign in…",
        onSuccess: async () => {
          setSucceeded(true);
          window.setTimeout(() => {
            navigate("/login", { replace: true });
          }, 1200);
        },
      },
    );

    if (!result) {
      form.setError("password", {
        message: "Unable to reset password. The link may have expired.",
      });
    }
  });

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
        <GlassCard className="w-full max-w-md">
          <DataErrorState
            description="No reset token found. Please request a new password reset link."
            onRetry={() => navigate("/forgot-password")}
            retryLabel="Forgot password"
          />
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-3 text-gray-900">Set New Password</h1>
          <p className="text-gray-700">
            {succeeded
              ? "Password updated successfully."
              : "Create a new password for your account."}
          </p>
        </div>

        {succeeded ? (
          <ActionSuccessState message="Redirecting to sign in…" />
        ) : (
          <Form {...form}>
            <form className="space-y-5" onSubmit={handleReset} noValidate>
              <FormField
                control={form.control}
                name="password"
                rules={{ ...passwordRules({ requiredMessage: "New password is required." }) }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-900">New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="New password"
                        autoComplete="new-password"
                        onChange={(e) => { clearStatus(); field.onChange(e); }}
                        onBlur={field.onBlur}
                        value={field.value}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                rules={{
                  ...confirmPasswordRules(() => form.getValues("password"), {
                    requiredMessage: "Please confirm your new password.",
                    mismatchMessage: "Passwords do not match.",
                  }),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-900">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        onChange={(e) => { clearStatus(); field.onChange(e); }}
                        onBlur={field.onBlur}
                        value={field.value}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submitError ? (
                <p className="text-sm text-red-600 text-center">{submitError}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Resetting…" : "Reset Password"}
              </Button>

              <p className="text-center text-sm text-gray-600 mt-2">
                <Link to="/login" className="underline hover:text-gray-900">
                  Back to sign in
                </Link>
              </p>
            </form>
          </Form>
        )}
      </GlassCard>
    </div>
  );
}
