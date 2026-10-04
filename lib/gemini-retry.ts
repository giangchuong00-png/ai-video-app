const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const PERMANENT_HTTP_STATUSES = new Set([
  400, 401, 403, 404, 405, 406, 409, 410, 412, 413, 415, 416, 422,
]);

const RETRYABLE_HTTP_STATUSES = new Set([
  408, 429, 500, 502, 503, 504,
]);

/** gRPC status codes that are typically transient. */
const RETRYABLE_GRPC_CODES = new Set([
  4, // DEADLINE_EXCEEDED
  8, // RESOURCE_EXHAUSTED
  10, // ABORTED
  13, // INTERNAL
  14, // UNAVAILABLE
]);

const PERMANENT_STATUS_NAMES = new Set([
  "INVALID_ARGUMENT",
  "NOT_FOUND",
  "PERMISSION_DENIED",
  "UNAUTHENTICATED",
  "FAILED_PRECONDITION",
  "OUT_OF_RANGE",
  "ALREADY_EXISTS",
]);

const RETRYABLE_STATUS_NAMES = new Set([
  "UNAVAILABLE",
  "RESOURCE_EXHAUSTED",
  "INTERNAL",
  "DEADLINE_EXCEEDED",
  "ABORTED",
  "GATEWAY_TIMEOUT",
  "SERVICE_UNAVAILABLE",
  "TOO_MANY_REQUESTS",
]);

const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

const MAX_ERROR_DEPTH = 4;

type ErrorSignals = {
  permanent: Set<string>;
  transient: Set<string>;
};

export type GeminiRetryBudget = {
  readonly maxAttempts: number;
  readonly deadlineAt: number;
  attempts: number;
};

export function createGeminiRetryBudget({
  maxAttempts,
  maxElapsedMs,
}: {
  maxAttempts: number;
  maxElapsedMs: number;
}): GeminiRetryBudget {
  return {
    maxAttempts: Math.max(1, Math.floor(maxAttempts)),
    deadlineAt: Date.now() + Math.max(1, Math.floor(maxElapsedMs)),
    attempts: 0,
  };
}

function addNumericSignal(
  value: number,
  signals: ErrorSignals
) {
  if (!Number.isFinite(value)) return;

  if (value >= 100 && value < 600) {
    if (PERMANENT_HTTP_STATUSES.has(value)) {
      signals.permanent.add(`HTTP_${value}`);
    } else if (RETRYABLE_HTTP_STATUSES.has(value)) {
      signals.transient.add(`HTTP_${value}`);
    }
    return;
  }

  if (RETRYABLE_GRPC_CODES.has(value)) {
    signals.transient.add(`GRPC_${value}`);
  }
}

function addStringSignal(
  value: string,
  signals: ErrorSignals
) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return;

  if (/^\d+$/.test(normalized)) {
    addNumericSignal(Number(normalized), signals);
    return;
  }

  if (PERMANENT_STATUS_NAMES.has(normalized)) {
    signals.permanent.add(normalized);
    return;
  }

  if (
    RETRYABLE_STATUS_NAMES.has(normalized) ||
    RETRYABLE_NETWORK_CODES.has(normalized)
  ) {
    signals.transient.add(normalized);
  }
}

function addSignal(
  value: unknown,
  signals: ErrorSignals
) {
  if (typeof value === "number") {
    addNumericSignal(value, signals);
  } else if (typeof value === "string") {
    addStringSignal(value, signals);
  }
}

function collectErrorSignals(
  error: unknown,
  signals: ErrorSignals,
  visited: Set<object>,
  depth: number
) {
  if (
    !error ||
    typeof error !== "object" ||
    depth > MAX_ERROR_DEPTH ||
    visited.has(error)
  ) {
    return;
  }

  visited.add(error);
  const record = error as Record<string, unknown>;

  addSignal(record.status, signals);
  addSignal(record.statusCode, signals);
  addSignal(record.code, signals);

  for (const key of ["error", "cause", "response", "data"] as const) {
    collectErrorSignals(record[key], signals, visited, depth + 1);
  }
}

function getErrorSignals(error: unknown): ErrorSignals {
  const signals: ErrorSignals = {
    permanent: new Set(),
    transient: new Set(),
  };

  collectErrorSignals(error, signals, new Set(), 0);
  return signals;
}

export function getGeminiErrorCategory(error: unknown): string {
  if (
    error instanceof Error &&
    error.name === "GeminiRetryBudgetError"
  ) {
    return "BUDGET_EXHAUSTED";
  }

  const signals = getErrorSignals(error);
  return (
    signals.permanent.values().next().value ||
    signals.transient.values().next().value ||
    "UNKNOWN_ERROR"
  );
}

export function isGeminiRetryableError(error: unknown): boolean {
  const signals = getErrorSignals(error);

  // Safe deterministic precedence: any recognized permanent signal wins.
  if (signals.permanent.size > 0) {
    return false;
  }

  return signals.transient.size > 0;
}

export function isGeminiPermanentError(error: unknown): boolean {
  return getErrorSignals(error).permanent.size > 0;
}

function computeBackoffDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  const exponential = Math.min(
    maxDelayMs,
    baseDelayMs * Math.pow(2, attempt)
  );
  // Jitter in [50%, 100%] of the capped exponential delay.
  const jitterFactor = 0.5 + Math.random() * 0.5;
  return Math.max(0, Math.floor(exponential * jitterFactor));
}

function describeRetryReason(error: unknown): string {
  const signals = getErrorSignals(error);
  return signals.transient.values().next().value || "TRANSIENT_ERROR";
}

function createBudgetExhaustedError() {
  const error = new Error("Gemini retry budget exhausted");
  error.name = "GeminiRetryBudgetError";
  return error;
}

export function consumeGeminiOperationBudget(
  budget: GeminiRetryBudget
) {
  if (
    budget.attempts >= budget.maxAttempts ||
    Date.now() >= budget.deadlineAt
  ) {
    throw createBudgetExhaustedError();
  }

  budget.attempts += 1;
}

export async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    maxElapsedMs?: number;
    label?: string;
    budget?: GeminiRetryBudget;
  }
): Promise<T> {
  const retries = Math.min(
    3,
    Math.max(0, Math.floor(options?.retries ?? 1))
  );
  const baseDelayMs = Math.max(0, options?.baseDelayMs ?? 1000);
  const maxDelayMs = Math.max(
    baseDelayMs,
    options?.maxDelayMs ?? 8000
  );
  const localDeadlineAt =
    Date.now() + Math.max(1, options?.maxElapsedMs ?? 30000);
  const deadlineAt = options?.budget
    ? Math.min(localDeadlineAt, options.budget.deadlineAt)
    : localDeadlineAt;
  const label = options?.label ?? "Gemini";

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (Date.now() >= deadlineAt) {
      throw lastError ?? createBudgetExhaustedError();
    }

    if (options?.budget) {
      consumeGeminiOperationBudget(options.budget);
    }

    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (!isGeminiRetryableError(error) || attempt === retries) {
        throw error;
      }

      const delayMs = computeBackoffDelayMs(
        attempt,
        baseDelayMs,
        maxDelayMs
      );

      if (Date.now() + delayMs >= deadlineAt) {
        throw error;
      }

      console.warn(
        `[${label}] retryable ${describeRetryReason(error)}; retry ${attempt + 1}/${retries}`
      );

      await sleep(delayMs);
    }
  }

  throw lastError ?? createBudgetExhaustedError();
}
