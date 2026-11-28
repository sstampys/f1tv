import { useSyncExternalStore } from "react";

/**
 * The season the visitor is looking at.
 *
 * On the routes that have a season selector the season lives in the URL
 * (?season=2018), so a choice survives a reload, a shared link and the
 * browser's back button. This tiny store remembers the same value for the
 * places that have no selector — the navigation pill, which carries it to the
 * next page — and for routes opened without a parameter.
 *
 * Like the stream status, the server snapshot is always empty: the server
 * does not know the visitor's choice, so the server and the first paint show
 * the latest season and the stored one takes over right after hydration.
 */
const STORAGE_KEY = "f1box:season";

let season: string | undefined;
let loaded = false;
const listeners = new Set<() => void>();

/**
 * The remembered season, or undefined when nothing has been chosen yet.
 *
 * Undefined, not an empty string: the callers fall back to the season they
 * would show anyway, and an empty string would win over that fallback.
 */
export function getSeason(): string | undefined {
  if (!loaded) {
    loaded = true;
    try {
      season = sessionStorage.getItem(STORAGE_KEY) || undefined;
    } catch {
      season = undefined;
    }
  }
  return season;
}

/** The server never knows the visitor's season. */
export const getSeasonServer = () => undefined;

/** Remember the season: for the navigation pill and for the next page. */
export function setSeason(value: string): void {
  const year = asSeason(value);
  if (!year || year === season) return;
  season = year;
  loaded = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, year);
  } catch {
    /* storage can be blocked; the choice still lasts for this page */
  }
  listeners.forEach((listener) => listener());
}

export function subscribeSeason(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The remembered season, kept in step with every change. */
export function useSeason(): string | undefined {
  return useSyncExternalStore(subscribeSeason, getSeason, getSeasonServer);
}

/** A season is a four digit year; anything else is not one. */
export function asSeason(value: unknown): string | undefined {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  return /^\d{4}$/.test(raw) ? raw : undefined;
}
