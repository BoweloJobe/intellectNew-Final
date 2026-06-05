import { useCallback, useRef, useState } from "react";
import { getAsyncErrorMessage } from "../utils/async-errors";
import { logError } from "../utils/logger";

export type AsyncViewState = "loading" | "success" | "error";

type UseAsyncViewStateOptions = {
  initialState?: AsyncViewState;
  defaultErrorMessage?: string;
};

export function useAsyncViewState(options: UseAsyncViewStateOptions = {}) {
  const {
    initialState = "loading",
    defaultErrorMessage = "Something went wrong. Please try again.",
  } = options;

  const [viewState, setViewState] = useState<AsyncViewState>(initialState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestCounterRef = useRef(0);

  const run = useCallback(async <TResult>(action: () => Promise<TResult>): Promise<TResult | null> => {
    const requestId = requestCounterRef.current + 1;
    requestCounterRef.current = requestId;
    setViewState("loading");
    setErrorMessage(null);

    try {
      const result = await action();

      if (requestCounterRef.current !== requestId) {
        return null;
      }

      setViewState("success");
      return result;
    } catch (error) {
      if (requestCounterRef.current !== requestId) {
        return null;
      }

      logError("Async view-state action failed", {
        error,
      });
      setErrorMessage(getAsyncErrorMessage(error, defaultErrorMessage));
      setViewState("error");
      return null;
    }
  }, [defaultErrorMessage]);

  return {
    viewState,
    errorMessage,
    isLoading: viewState === "loading",
    isError: viewState === "error",
    run,
  };
}
