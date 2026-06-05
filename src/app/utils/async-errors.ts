import { toApiError } from "../api";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function getAsyncErrorMessage(error: unknown, fallbackMessage = GENERIC_ERROR_MESSAGE): string {
  const apiError = toApiError(error);
  const message = apiError.message.trim();

  if (message.length === 0 || message === "Unexpected API error.") {
    return fallbackMessage;
  }

  return message;
}
