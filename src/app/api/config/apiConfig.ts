import { logWarn } from "../../utils/logger";

export type AdapterMode = "mock" | "api";

export type ServiceDomain =
  | "auth"
  | "courses"
  | "lessons"
  | "quizzes"
  | "progress"
  | "subscription"
  | "notifications"
  | "notes"
  | "dashboard"
  | "community"
  | "tutor";

export type DomainAdapterConfig = Record<ServiceDomain, AdapterMode>;

export interface ApiConfig {
  adapterMode: AdapterMode;
  baseUrl: string;
  timeoutMs: number;
  defaultHeaders: Readonly<Record<string, string>>;
}

const DEFAULT_ADAPTER_MODE: AdapterMode = "mock";
const DEFAULT_TIMEOUT_MS = 10000;

function normalizeAdapterMode(value: string | undefined): AdapterMode {
  if (typeof value !== "string") {
    return DEFAULT_ADAPTER_MODE;
  }

  return value.toLowerCase() === "api" ? "api" : DEFAULT_ADAPTER_MODE;
}

function normalizeDomainAdapterMode(
  domainValue: string | undefined,
  fallback: AdapterMode,
): AdapterMode {
  // Treat undefined and empty string identically: the domain has no explicit
  // override, so inherit the global adapter mode.
  if (!domainValue) {
    return fallback;
  }

  return domainValue.toLowerCase() === "api" ? "api" : "mock";
}

function parseTimeoutMs(value: string | undefined): number {
  if (typeof value !== "string") {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }

  return parsed;
}

function normalizeBaseUrl(value: string | undefined): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export const apiConfig: ApiConfig = {
  adapterMode: normalizeAdapterMode(import.meta.env.VITE_SERVICE_ADAPTER_MODE),
  baseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  timeoutMs: parseTimeoutMs(import.meta.env.VITE_API_TIMEOUT),
  defaultHeaders: {
    Accept: "application/json",
  },
};

export const adapterMode = apiConfig.adapterMode;
export const isApiMode = adapterMode === "api";

export const domainAdapterConfig: DomainAdapterConfig = {
  auth: normalizeDomainAdapterMode(import.meta.env.VITE_AUTH_ADAPTER_MODE, adapterMode),
  courses: normalizeDomainAdapterMode(import.meta.env.VITE_COURSES_ADAPTER_MODE, adapterMode),
  lessons: normalizeDomainAdapterMode(import.meta.env.VITE_LESSONS_ADAPTER_MODE, adapterMode),
  quizzes: normalizeDomainAdapterMode(import.meta.env.VITE_QUIZZES_ADAPTER_MODE, adapterMode),
  progress: normalizeDomainAdapterMode(import.meta.env.VITE_PROGRESS_ADAPTER_MODE, adapterMode),
  subscription: normalizeDomainAdapterMode(import.meta.env.VITE_SUBSCRIPTION_ADAPTER_MODE, adapterMode),
  notifications: normalizeDomainAdapterMode(import.meta.env.VITE_NOTIFICATIONS_ADAPTER_MODE, adapterMode),
  notes: normalizeDomainAdapterMode(import.meta.env.VITE_NOTES_ADAPTER_MODE, adapterMode),
  dashboard: normalizeDomainAdapterMode(import.meta.env.VITE_DASHBOARD_ADAPTER_MODE, adapterMode),
  community: normalizeDomainAdapterMode(import.meta.env.VITE_COMMUNITY_ADAPTER_MODE, adapterMode),
  tutor: normalizeDomainAdapterMode(import.meta.env.VITE_TUTOR_ADAPTER_MODE, adapterMode),
};

function getApiDomainNames(config: DomainAdapterConfig): Array<keyof DomainAdapterConfig> {
  return (Object.keys(config) as Array<keyof DomainAdapterConfig>).filter(
    (domain) => config[domain] === "api",
  );
}

const apiDomains = getApiDomainNames(domainAdapterConfig);
const apiAdapterRequired = apiConfig.adapterMode === "api" || apiDomains.length > 0;

if (apiAdapterRequired && apiConfig.baseUrl === "") {
  const neededFor = apiConfig.adapterMode === "api" ? "global VITE_SERVICE_ADAPTER_MODE=api" : "a domain override to api";
  throw new Error(
    `VITE_API_BASE_URL is required when using api service adapters (unexpected due to ${neededFor}). ` +
      "Set VITE_API_BASE_URL to the backend root URL, for example http://localhost:4000/api.",
  );
}

if (import.meta.env.PROD && apiConfig.adapterMode === "mock" && apiDomains.length === 0) {
  logWarn("Production build defaulting to mock service adapters", {
    adapterMode: import.meta.env.VITE_SERVICE_ADAPTER_MODE ?? "<unset>",
    apiBaseUrl: apiConfig.baseUrl || "<unset>",
    guidance: "Set VITE_SERVICE_ADAPTER_MODE=api and VITE_API_BASE_URL=... to enable real backend services.",
  });
}
