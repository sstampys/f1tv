import { useLayoutEffect, useState } from "react";
import { readEntry, writeEntry } from "./store";
import { request } from "./client";

/** A resource is just its cache key, endpoint, stale-after window and parser. */
export type Resource<T> = {
  key: string;
  url: string;
  ttl: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parse: (raw: any) => T;
};

export type ResourceState<T> = { data: T | null; error: unknown; updatedAt: number };

/** State carries the key it belongs to, so one key never shows another's data. */
type Stored<T> = ResourceState<T> & { key: string };

const IDLE: Stored<never> = { key: "", data: null, error: null, updatedAt: 0 };

/**
 * Stale-while-revalidate read of a resource.
 *
 * The initial render (server and hydration) is always empty and matches the
 * server HTML. A layout effect then reads the cache synchronously and, before
 * the first paint, either shows fresh data with no network at all or shows stale
 * data while the request revalidates in the background. A stale or missing
 * cache never blocks the cached value from rendering.
 *
 * When the key changes (switching season, tab, etc.) the previous key's data is
 * never shown under the new key: the hook reports "empty" until the new key's
 * cache or network value arrives. This is what stops a slow or failed request
 * from leaving the old season's races on screen.
 */
export function useResource<T>(res: Resource<T>, enabled = true): ResourceState<T> {
  const [state, setState] = useState<Stored<T>>(IDLE as Stored<T>);

  useLayoutEffect(() => {
    if (!enabled) return;
    const key = res.key;
    let alive = true;

    const entry = readEntry<T>(key);
    if (entry) {
      setState({ key, data: entry.d, error: null, updatedAt: entry.t });
      if (Date.now() - entry.t < res.ttl) return; // fresh: no network
    }

    request<unknown>(key, res.url)
      .then(res.parse)
      .then(
        (data) => {
          writeEntry(key, data); // persist for warm visits
          if (!alive) return;
          setState({ key, data, error: null, updatedAt: Date.now() });
        },
        (error) => {
          // Never blank a populated page: keep the last good data on failure.
          if (!alive) return;
          setState((s) => (s.key === key && s.data ? s : { key, data: null, error, updatedAt: 0 }));
        },
      );

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.key, res.url, res.ttl, enabled]);

  // Only ever expose data that belongs to the key we are rendering now.
  return state.key === res.key ? state : (IDLE as ResourceState<T>);
}

/** Start a resource's request early (hover/focus intent) if it is not fresh. */
export function prefetchResource<T>(res: Resource<T>) {
  const entry = readEntry<T>(res.key);
  if (entry && Date.now() - entry.t < res.ttl) return;
  request<unknown>(res.key, res.url)
    .then(res.parse)
    .then((data) => writeEntry(res.key, data))
    .catch(() => {});
}
