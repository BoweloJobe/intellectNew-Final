import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncFormSubmission } from "../hooks/useAsyncFormSubmission";
import { Button } from "../components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import {
  confirmPasswordRules,
  emailRules,
  normalizeEmailInput,
  normalizePhoneInput,
  passwordRules,
  phoneRules,
} from "../utils/form-validation";
import {
  resetPassword,
  sendPasswordResetCode,
  type PasswordResetChannel,
  verifyPasswordResetCode,
} from "../../services/auth";
import { domainAdapterConfig } from "../api/config/apiConfig";

type ForgotPasswordStep = "contact" | "verify" | "email-sent" | "reset" | "success";

type ContactFormValues = {
  channel: PasswordResetChannel;
  destination: string;
};

type VerifyCodeFormValues = {
  code: string;
};

type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

type ResetChallengeState = {
  challengeId: string;
  channel: PasswordResetChannel;
  destination: string;
  maskedDestination: string;
  verificationToken: string | null;
};

const OTP_LENGTH = 6;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ForgotPasswordStep>("contact");
  const [challenge, setChallenge] = useState<ResetChallengeState | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const { isSubmitting, submitError, submitSuccess, clearStatus, run } = useAsyncFormSubmission();

  const contactForm = useForm<ContactFormValues>({
    defaultValues: {
      channel: "email",
      destination: "",
    },
    mode: "onBlur",
  });

  const verifyCodeForm = useForm<VerifyCodeFormValues>({
    defaultValues: {
      code: "",
    },
    mode: "onBlur",
  });

  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const selectedChannel = contactForm.watch("channel");
  const authIsApiMode = domainAdapterConfig.auth === "api";

  const handleSendCode = contactForm.handleSubmit(async (values) => {
    clearStatus();

    const normalizedDestination =
      values.channel === "email"
        ? normalizeEmailInput(values.destination)
        : normalizePhoneInput(values.destination);

    const result = await run(
      async () => {
        const sendResult = await sendPasswordResetCode({
          channel: values.channel,
          destination: normalizedDestination,
        });

        if (!sendResult.ok) {
          throw new Error(sendResult.message);
        }

        return sendResult;
      },
      {
        successMessage: "Recovery email sent.",
        onSuccess: async (sendResult) => {
          setChallenge({
            challengeId: sendResult.challengeId,
            channel: sendResult.channel,
            destination: normalizedDestination,
            maskedDestination: sendResult.maskedDestination,
            verificationToken: null,
          });
          setRemainingAttempts(null);
          verifyCodeForm.reset({ code: "" });
          resetPasswordForm.reset({ password: "", confirmPassword: "" });
          // In API mode the backend sends a URL reset link by email — there is
          // no 6-digit code step.  Direct the user to check their inbox.
          setStep(authIsApiMode ? "email-sent" : "verify");
        },
      },
    );

    if (!result) {
      contactForm.setError("destination", {
        message: "Unable to send verification code. Check your contact and try again.",
      });
    }
  });

  const handleVerifyCode = verifyCodeForm.handleSubmit(async (values) => {
    if (!challenge) {
      return;
    }

    clearStatus();

    const result = await run(
      async () => {
        const verifyResult = await verifyPasswordResetCode({
          challengeId: challenge.challengeId,
          code: values.code,
        });

        if (!verifyResult.ok) {
          setRemainingAttempts(verifyResult.remainingAttempts ?? null);
          throw new Error(verifyResult.message);
        }

        return verifyResult;
      },
      {
        successMessage: "Code verified. Set your new password.",
        onSuccess: async (verifyResult) => {
          setChallenge((previous) =>
            previous
              ? {
                  ...previous,
                  verificationToken: verifyResult.verificationToken,
                }
              : previous,
          );
          setRemainingAttempts(verifyResult.remainingAttempts);
          setStep("reset");
        },
      },
    );

    if (!result) {
      verifyCodeForm.setError("code", {
        message: "Invalid verification code.",
      });
    }
  });

  const handleResetPassword = resetPasswordForm.handleSubmit(async (values) => {
    if (!challenge || challenge.verificationToken === null) {
      return;
    }

    const { challengeId, verificationToken } = challenge;

    clearStatus();

    const result = await run(
      async () => {
        const resetResult = await resetPassword({
          challengeId,
          verificationToken,
          newPassword: values.password,
        });

        if (!resetResult.ok) {
          throw new Error(resetResult.message);
        }

        return resetResult;
      },
      {
        successMessage: "Password reset complete. Redirecting to sign in...",
        onSuccess: async () => {
          setStep("success");
          window.setTimeout(() => {
            navigate("/login", { replace: true });
          }, 1100);
        },
      },
    );

    if (!result) {
      resetPasswordForm.setError("password", {
        message: "Unable to reset password. Please try again.",
      });
    }
  });

  const resetFlow = () => {
    clearStatus();
    setStep("contact");
    setChallenge(null);
    setRemainingAttempts(null);
    contactForm.reset({ channel: "email", destination: "" });
    verifyCodeForm.reset({ code: "" });
    resetPasswordForm.reset({ password: "", confirmPassword: "" });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <GlassCard className="w-full max-w-md">
        {step === "verify" && !authIsApiMode && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Demo mode</span> — no email is sent. Your verification code has been printed to the browser console (F12 → Console).
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold mb-3 text-gray-900">Forgot Password</h1>
          <p className="text-gray-700">
            {step === "contact" ? "Recover access with your email address." : null}
            {step === "verify" && challenge
              ? `Enter the 6-digit code sent to ${challenge.maskedDestination}.`
              : null}
            {step === "email-sent" && challenge
              ? `Check your inbox at ${challenge.maskedDestination} and follow the reset link.`
              : null}
            {step === "reset" ? "Set a new password for your account." : null}
            {step === "success" ? "Password updated successfully." : null}
          </p>
        </div>

        {step === "contact" ? (
          <Form {...contactForm}>
            <form className="space-y-5" onSubmit={handleSendCode} noValidate>
              <FormField
                control={contactForm.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-900">Recovery Method</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        className="grid grid-cols-2 gap-4"
                        onValueChange={(value) => {
                          clearStatus();
                          field.onChange(value as PasswordResetChannel);
                          contactForm.setValue("destination", "");
                        }}
                      >
                        <label className="flex items-center gap-2 rounded-md border border-input bg-white/[0.45] px-3 py-2 text-sm">
                          <RadioGroupItem value="email" />
                          <span>Email</span>
                        </label>
                        {!authIsApiMode && (
                          <label className="flex items-center gap-2 rounded-md border border-input bg-white/[0.45] px-3 py-2 text-sm">
                            <RadioGroupItem value="phone" />
                            <span>Phone</span>
                          </label>
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={contactForm.control}
                name="destination"
                rules={{
                  validate: {
                    requiredTrimmed: (value: string) => {
                      const requiredMessage =
                        selectedChannel === "email" ? "Email is required." : "Phone number is required.";

                      return value.trim().length > 0 || requiredMessage;
                    },
                    destinationFormat: (value: string) => {
                      if (selectedChannel === "email") {
                        return emailRules().validate.emailFormat(value);
                      }

                      return phoneRules().validate.phoneFormat(value);
                    },
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-900">
                      {selectedChannel === "email" ? "Email Address" : "Phone Number"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type={selectedChannel === "email" ? "email" : "tel"}
                        placeholder={selectedChannel === "email" ? "you@example.com" : "+1 415 555 0101"}
                        className="bg-white/[0.45]"
                        autoComplete={selectedChannel === "email" ? "email" : "tel"}
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
                <DataErrorState title="Code request failed" description={submitError} />
              ) : null}

              {submitSuccess ? <ActionSuccessState message={submitSuccess} /> : null}

              <Button type="submit" className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white" disabled={isSubmitting}>
                {isSubmitting ? "Sending code..." : "Send Code"}
              </Button>
            </form>
          </Form>
        ) : null}

        {step === "verify" ? (
          <Form {...verifyCodeForm}>
            <form className="space-y-5" onSubmit={handleVerifyCode} noValidate>
              <FormField
                control={verifyCodeForm.control}
                name="code"
                rules={{
                  validate: {
                    requiredTrimmed: (value: string) => value.trim().length > 0 || "Verification code is required.",
                    exactLength: (value: string) => value.trim().length === OTP_LENGTH || "Enter the 6-digit code.",
                    digitsOnly: (value: string) => /^\d+$/.test(value.trim()) || "Code must contain only digits.",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-900">Verification Code</FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={OTP_LENGTH}
                        value={field.value}
                        disabled={isSubmitting}
                        onChange={(value) => {
                          clearStatus();
                          field.onChange(value);
                        }}
                      >
                        <InputOTPGroup className="w-full justify-center">
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {remainingAttempts !== null ? (
                <p className="text-xs text-gray-600 text-center">Attempts remaining: {remainingAttempts}</p>
              ) : null}

              {submitError ? (
                <DataErrorState title="Code verification failed" description={submitError} />
              ) : null}

              {submitSuccess ? <ActionSuccessState message={submitSuccess} /> : null}

              <Button type="submit" className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white" disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "Verify Code"}
              </Button>

              <Button type="button" variant="outline" className="w-full bg-white/[0.45]" disabled={isSubmitting} onClick={resetFlow}>
                Start Over
              </Button>
            </form>
          </Form>
        ) : null}

        {step === "reset" ? (
          <Form {...resetPasswordForm}>
            <form className="space-y-5" onSubmit={handleResetPassword} noValidate>
              <FormField
                control={resetPasswordForm.control}
                name="password"
                rules={{
                  ...passwordRules({ requiredMessage: "New password is required." }),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-900">New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Create a new password"
                        className="bg-white/[0.45]"
                        autoComplete="new-password"
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
                control={resetPasswordForm.control}
                name="confirmPassword"
                rules={{
                  ...confirmPasswordRules(() => resetPasswordForm.getValues("password"), {
                    requiredMessage: "Please confirm your new password.",
                    mismatchMessage: "Passwords do not match.",
                  }),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-900">Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Repeat your new password"
                        className="bg-white/[0.45]"
                        autoComplete="new-password"
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
                <DataErrorState title="Password reset failed" description={submitError} />
              ) : null}

              {submitSuccess ? <ActionSuccessState message={submitSuccess} /> : null}

              <Button type="submit" className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white" disabled={isSubmitting}>
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </Form>
        ) : null}

        {step === "email-sent" ? (
          <div className="space-y-5">
            <ActionSuccessState
              message={`A password reset link has been sent to ${challenge?.maskedDestination ?? "your email"}. Click the link in the email to set a new password.`}
            />
            <p className="text-xs text-center text-gray-500">
              Didn&apos;t receive it? Check your spam folder, or{" "}
              <button type="button" className="text-[#4a9ff5] hover:underline" onClick={resetFlow}>
                try again
              </button>
              .
            </p>
          </div>
        ) : null}

        {step === "success" ? (
          <div className="space-y-4">
            <ActionSuccessState message="Your password has been reset. Redirecting to sign in..." />
            <Button type="button" className="w-full bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white" onClick={() => navigate("/login", { replace: true })}>
              Go To Login
            </Button>
          </div>
        ) : null}

        <div className="mt-7 text-center text-gray-700 text-sm">
          Remembered your password?{" "}
          <Link to="/login" className="text-[#4a9ff5] hover:text-[#2e8ef7] font-medium">
            Sign in
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
