import { EARLY_GLOBAL, LIMITS } from "./config";

/**
 * Request layer: one request per resource at a time, a client-side limiter that
 * keeps the app under the API's burst limit, and retry with backoff that honours
 * Retry-After. It also consumes the in-flight fetches started by the inline
 * head script so the critical request begins during HTML parse.
 */

type EarlyGlobal = Record<string, Promise<Response>>;

function early(): EarlyGlobal | undefined {
  return (globalThis as unknown as Record<string, EarlyGlobal | undefined>)[EARLY_GLOBAL];
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---- limiter: space request starts so at most LIMITS.burst happen per window ----
const minSpacing = LIMITS.burstWindowMs / LIMITS.burst;
let lastStart = 0;
let gate: Promise<void> = Promise.resolve();

function acquire(): Promise<void> {
  const mine = gate.then(async () => {
    const since = Date.now() - lastStart;
    if (since < minSpacing) await sleep(minSpacing - since);
    lastStart = Date.now();
  });
  gate = mine.catch(() => {});
  return mine;
}

// ---- in-flight de-duplication by resource key ----
const inflight = new Map<string, Promise<unknown>>();

export class HttpError extends Error {
  status: number;
  retryAfterMs: number;
  constructor(status: number, retryAfterMs = 0) {
    super(`HTTP ${status}`);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function parseRetryAfter(res: Response): number {
  const header = res.headers.get("retry-after");
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

function backoffMs(attempt: number, retryAfterMs: number): number {
  if (retryAfterMs > 0) return Math.min(retryAfterMs, LIMITS.backoffCapMs);
  const base = Math.min(LIMITS.backoffBaseMs * 2 ** attempt, LIMITS.backoffCapMs);
  return base + Math.floor(Math.random() * LIMITS.backoffBaseMs); // jitter
}

async function doFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITS.requestTimeoutMs);
  try {
    await acquire();
    return await fetch(url, {
      headers: { Accept: "application/json" },
      mode: "cors",
      credentials: "omit",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function run<T>(key: string, url: string): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      // First attempt: reuse the request the inline head script already started
      // (then drop it, so a later revalidation fetches fresh).
      const pending = attempt === 0 ? early()?.[url] : undefined;
      if (attempt === 0 && pending) delete early()![url];
      const res = pending ? await pending : await doFetch(url);
      if (res.status === 429) throw new HttpError(429, parseRetryAfter(res));
      if (!res.ok) throw new HttpError(res.status, parseRetryAfter(res));
      return (await res.json()) as T;
    } catch (error) {
      if (attempt >= LIMITS.maxRetries) throw error;
      const retryAfter = error instanceof HttpError ? error.retryAfterMs : 0;
      // A hard client error (not 429) will not get better by retrying.
      if (error instanceof HttpError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      await sleep(backoffMs(attempt, retryAfter));
      attempt++;
    }
  }
}

/** Fetch a resource by key, de-duplicating any in-flight request for that key. */
export function request<T>(key: string, url: string): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = run<T>(key, url);
  inflight.set(key, promise);
  promise.catch(() => {}).finally(() => {
    if (inflight.get(key) === promise) inflight.delete(key);
  });
  return promise;
}
