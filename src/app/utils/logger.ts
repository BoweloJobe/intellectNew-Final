type LogLevel = "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeError(error: Error): Record<string, unknown> {
  const normalized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };

  if (import.meta.env.DEV && typeof error.stack === "string" && error.stack.length > 0) {
    normalized.stack = error.stack;
  }

  return normalized;
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return normalizeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (isRecord(value)) {
    const normalized: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      normalized[key] = normalizeValue(nestedValue);
    }

    return normalized;
  }

  return value;
}

function shouldLog(level: LogLevel): boolean {
  if (level === "info") {
    return import.meta.env.DEV;
  }

  return true;
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}): void {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: normalizeValue(context),
  };

  const label = `[intellectx:${level}] ${message}`;

  if (level === "error") {
    console.error(label, payload);
    return;
  }

  if (level === "warn") {
    console.warn(label, payload);
    return;
  }

  console.info(label, payload);
}

export function logInfo(message: string, context: LogContext = {}): void {
  writeLog("info", message, context);
}

export function logWarn(message: string, context: LogContext = {}): void {
  writeLog("warn", message, context);
}

export function logError(message: string, context: LogContext = {}): void {
  writeLog("error", message, context);
}