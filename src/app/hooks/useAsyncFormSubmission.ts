import { useState } from "react";
import { getAsyncErrorMessage } from "../utils/async-errors";
import { logError } from "../utils/logger";

type RunOptions<TResult> = {
  successMessage: string;
  onSuccess?: (result: TResult) => void | Promise<void>;
  clearSuccessAfterMs?: number;
};

export function useAsyncFormSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const clearStatus = () => {
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const run = async <TResult>(
    action: () => Promise<TResult>,
    options: RunOptions<TResult>,
  ): Promise<TResult | null> => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const result = await action();
      setSubmitSuccess(options.successMessage);

      if (options.onSuccess) {
        await options.onSuccess(result);
      }

      const clearAfter = options.clearSuccessAfterMs ?? 2200;
      if (clearAfter > 0) {
        window.setTimeout(() => {
          setSubmitSuccess(null);
        }, clearAfter);
      }

      return result;
    } catch (error) {
      logError("Async form submission failed", {
        error,
      });
      setSubmitError(getAsyncErrorMessage(error));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitError,
    submitSuccess,
    clearStatus,
    run,
  };
}
