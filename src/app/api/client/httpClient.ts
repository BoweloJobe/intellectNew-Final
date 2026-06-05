import { apiConfig } from "../config/apiConfig";
import {
  ApiError,
  mapFetchError,
  mapHttpError,
  mapParseError,
  mapTimeoutError,
} from "../errors/apiErrors";
import { logError, logWarn } from "../../utils/logger";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export interface HttpRequestOptions<TBody = unknown> {
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  body?: TBody;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const hasAbsoluteUrl = /^https?:\/\//i.test(path);
  const normalizedPath = hasAbsoluteUrl
    ? path
    : path.startsWith("/")
      ? path
      : `/${path}`;

  const source = hasAbsoluteUrl
    ? normalizedPath
    : apiConfig.baseUrl.length > 0
      ? `${apiConfig.baseUrl}${normalizedPath}`
      : normalizedPath;

  const url = new URL(source, typeof window !== "undefined" ? window.location.origin : "http://localhost");

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  if (source.startsWith("/")) {
    return `${url.pathname}${url.search}`;
  }

  return url.toString();
}

function shouldSerializeJson(body: unknown): boolean {
  if (body === null || body === undefined) {
    return false;
  }

  if (body instanceof FormData || body instanceof Blob || body instanceof URLSearchParams) {
    return false;
  }

  return typeof body === "object" || Array.isArray(body);
}

async function parseErrorPayload(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }

  try {
    const text = await response.text();
    return text.length > 0 ? text : undefined;
  } catch {
    return undefined;
  }
}

async function parseResponse<TResponse>(response: Response, method: HttpMethod, url: string): Promise<TResponse> {
  if (response.status === 204 || response.status === 205) {
    return undefined as TResponse;
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength === "0") {
    return undefined as TResponse;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    try {
      return (await response.json()) as TResponse;
    } catch (error) {
      throw mapParseError(error, { method, url });
    }
  }

  try {
    const text = await response.text();
    if (text.length === 0) {
      return undefined as TResponse;
    }

    return text as unknown as TResponse;
  } catch (error) {
    throw mapParseError(error, { method, url });
  }
}

async function request<TResponse, TBody = unknown>(
  method: HttpMethod,
  path: string,
  options: HttpRequestOptions<TBody> = {},
): Promise<TResponse> {
  const url = buildUrl(path, options.query);
  const timeoutMs = options.timeoutMs ?? apiConfig.timeoutMs;
  const timeoutController = new AbortController();
  let didTimeout = false;

  const onAbort = (): void => {
    timeoutController.abort(options.signal?.reason);
  };

  options.signal?.addEventListener("abort", onAbort);

  const timeoutHandle = setTimeout(() => {
    didTimeout = true;
    timeoutController.abort(new Error("Request timeout"));
  }, timeoutMs);

  const requestHeaders: Record<string, string> = {
    ...apiConfig.defaultHeaders,
    ...(options.headers ?? {}),
  };

  const fetchInit: RequestInit = {
    method,
    headers: requestHeaders,
    signal: timeoutController.signal,
  };

  if (options.body !== undefined) {
    if (shouldSerializeJson(options.body)) {
      if (!("Content-Type" in requestHeaders) && !("content-type" in requestHeaders)) {
        requestHeaders["Content-Type"] = "application/json";
      }

      fetchInit.body = JSON.stringify(options.body);
    } else {
      fetchInit.body = options.body as BodyInit;
    }
  }

  const logApiError = (error: ApiError): void => {
    const context = {
      category: error.category,
      status: error.status,
      method: error.method ?? method,
      url: error.url ?? url,
      operation: error.operation,
      details: error.details,
      cause: error.cause,
      requestPath: path,
    };

    if (error.category === "http" && typeof error.status === "number" && error.status < 500) {
      logWarn("API request failed", context);
      return;
    }

    logError("API request failed", context);
  };

  try {
    const response = await fetch(url, fetchInit);

    if (!response.ok) {
      const errorPayload = await parseErrorPayload(response);
      throw mapHttpError(response.status, errorPayload, { method, url });
    }

    return await parseResponse<TResponse>(response, method, url);
  } catch (error) {
    if (error instanceof ApiError) {
      logApiError(error);
      throw error;
    }

    if (didTimeout) {
      const timeoutError = mapTimeoutError(timeoutMs, { method, url });
      logApiError(timeoutError);
      throw timeoutError;
    }

    const fetchError = mapFetchError(error, { method, url });
    logApiError(fetchError);
    throw fetchError;
  } finally {
    clearTimeout(timeoutHandle);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

export const httpClient = {
  request,
  get<TResponse>(path: string, options: Omit<HttpRequestOptions<never>, "body"> = {}): Promise<TResponse> {
    return request<TResponse>("GET", path, options);
  },
  post<TResponse, TBody = unknown>(path: string, options: HttpRequestOptions<TBody> = {}): Promise<TResponse> {
    return request<TResponse, TBody>("POST", path, options);
  },
  put<TResponse, TBody = unknown>(path: string, options: HttpRequestOptions<TBody> = {}): Promise<TResponse> {
    return request<TResponse, TBody>("PUT", path, options);
  },
  patch<TResponse, TBody = unknown>(path: string, options: HttpRequestOptions<TBody> = {}): Promise<TResponse> {
    return request<TResponse, TBody>("PATCH", path, options);
  },
  delete<TResponse, TBody = unknown>(path: string, options: HttpRequestOptions<TBody> = {}): Promise<TResponse> {
    return request<TResponse, TBody>("DELETE", path, options);
  },
};
