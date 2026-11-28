import { useEffect, useState } from "react";
import { HttpError, lastErrorFor, subscribeRequestError } from "./client";
import { LOADING } from "./config";

/**
 * Why a load failed.
 *
 * The data API throttles bursts and answers a throttled request with 429.
 * Everything else — a round that does not exist, a server fault, a request
 * that never came back — is a website error. The two are told apart so the
 * message can name the one that happened: a rate limit clears itself in a
 * moment, a website error usually does not.
 */
export type LoadCause = "rate-limit" | "website";

export function loadCause(error: unknown): LoadCause {
  if (error instanceof HttpError && error.status === 429) return "rate-limit";
  return "website";
}

/** The message under an error title; it names the cause of the failure. */
export function loadErrorMessage(error: unknown, what: string): string {
  if (loadCause(error) === "rate-limit") {
    return `The API rate limit was reached while loading ${what}. Please wait a moment and try again.`;
  }
  return `A website error stopped ${what} from loading. Please try again.`;
}

/**
 * How long a load has been waiting, and what went wrong while it waited.
 *
 * `slow` turns true once the load has waited longer than the shared timeout:
 * the spinner has said enough and the page owes the visitor an explanation.
 * `error` is the most recent failure seen for the resource — the rate limit
 * that is being retried, for instance — so the message can name the cause.
 */
export function useLoadTimeout(key: string, waiting: boolean): { slow: boolean; error: unknown } {
  const [slow, setSlow] = useState(false);
  const [attemptError, setAttemptError] = useState<unknown>(null);

  useEffect(() => {
    if (!waiting) {
      setSlow(false);
      setAttemptError(null);
      return;
    }
    setSlow(false);
    setAttemptError(lastErrorFor(key));
    const timer = window.setTimeout(() => setSlow(true), LOADING.slowMs);
    const unsubscribe = subscribeRequestError(key, (error) => setAttemptError(error));
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [key, waiting]);

  return { slow, error: attemptError };
}
