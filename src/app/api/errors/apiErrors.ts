export type ApiErrorCategory = "network" | "timeout" | "http" | "parse" | "unknown";

export interface ApiErrorContext {
  method?: string;
  url?: string;
  operation?: string;
}

export interface ApiErrorShape {
  category: ApiErrorCategory;
  message: string;
  status?: number;
  method?: string;
  url?: string;
  operation?: string;
  details?: unknown;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly category: ApiErrorCategory;
  readonly status?: number;
  readonly method?: string;
  readonly url?: string;
  readonly operation?: string;
  readonly details?: unknown;
  readonly cause?: unknown;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = "ApiError";
    this.category = shape.category;
    this.status = shape.status;
    this.method = shape.method;
    this.url = shape.url;
    this.operation = shape.operation;
    this.details = shape.details;
    this.cause = shape.cause;
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  if (error instanceof Error) {
    return error.name === "AbortError";
  }

  return false;
}

function tryReadErrorMessage(payload: unknown): string | undefined {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const maybeMessage = (payload as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }

    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === "string" && maybeError.trim().length > 0) {
      return maybeError;
    }
  }

  return undefined;
}

function defaultHttpMessage(status: number): string {
  if (status >= 500) {
    return "Server error while processing the request.";
  }

  if (status === 404) {
    return "Requested resource was not found.";
  }

  if (status === 401 || status === 403) {
    return "You are not authorized to perform this request.";
  }

  if (status >= 400) {
    return "Request failed due to invalid input or state.";
  }

  return "Unexpected HTTP response.";
}

export function mapTimeoutError(timeoutMs: number, context: ApiErrorContext = {}): ApiError {
  return new ApiError({
    category: "timeout",
    message: `Request timed out after ${timeoutMs}ms.`,
    method: context.method,
    url: context.url,
    operation: context.operation,
  });
}

export function mapFetchError(error: unknown, context: ApiErrorContext = {}): ApiError {
  if (isAbortError(error)) {
    return new ApiError({
      category: "network",
      message: "Request was aborted.",
      method: context.method,
      url: context.url,
      operation: context.operation,
      cause: error,
    });
  }

  const message = error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Network request failed.";

  return new ApiError({
    category: "network",
    message,
    method: context.method,
    url: context.url,
    operation: context.operation,
    cause: error,
  });
}

export function mapHttpError(
  status: number,
  payload: unknown,
  context: ApiErrorContext = {},
): ApiError {
  const message = tryReadErrorMessage(payload) ?? defaultHttpMessage(status);

  return new ApiError({
    category: "http",
    message,
    status,
    method: context.method,
    url: context.url,
    operation: context.operation,
    details: payload,
  });
}

export function mapParseError(error: unknown, context: ApiErrorContext = {}): ApiError {
  return new ApiError({
    category: "parse",
    message: "Could not parse server response.",
    method: context.method,
    url: context.url,
    operation: context.operation,
    cause: error,
  });
}

export function toApiError(error: unknown, context: ApiErrorContext = {}): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAbortError(error)) {
    return new ApiError({
      category: "unknown",
      message: "Request was aborted.",
      method: context.method,
      url: context.url,
      operation: context.operation,
      cause: error,
    });
  }

  const message = error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Unexpected API error.";

  return new ApiError({
    category: "unknown",
    message,
    method: context.method,
    url: context.url,
    operation: context.operation,
    cause: error,
  });
}
