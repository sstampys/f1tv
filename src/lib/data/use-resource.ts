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

const IDLE: ResourceState<never> = { data: null, error: null, updatedAt: 0 };

/**
 * Stale-while-revalidate read of a resource.
 *
 * The initial render (server and hydration) is always empty and matches the
 * server HTML. A layout effect then reads the cache synchronously and, before
 * the first paint, either shows fresh data with no network at all or shows stale
 * data while the request revalidates in the background. A stale or missing
 * cache never blocks the cached value from rendering.
 */
export function useResource<T>(res: Resource<T>, enabled = true): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>(IDLE as ResourceState<T>);

  useLayoutEffect(() => {
    if (!enabled) return;
    let alive = true;

    const entry = readEntry<T>(res.key);
    if (entry) {
      setState({ data: entry.d, error: null, updatedAt: entry.t });
      if (Date.now() - entry.t < res.ttl) return; // fresh: no network
    }

    request<unknown>(res.key, res.url)
      .then(res.parse)
      .then(
        (data) => {
          writeEntry(res.key, data); // persist for warm visits
          if (!alive) return;
          setState({ data, error: null, updatedAt: Date.now() });
        },
        (error) => {
          // Never blank a populated page: keep the last good data on failure.
          if (!alive) return;
          setState((s) => (s.data ? s : { data: null, error, updatedAt: 0 }));
        },
      );

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.key, res.url, res.ttl, enabled]);

  return state;
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
