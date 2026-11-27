/**
 * Single source of truth for the browser data layer: hosts, endpoints, TTLs and
 * limits. Nothing else in the app hard-codes these values.
 */

export const HOSTS = {
  jolpica: "api.jolpi.ca",
  ppv: "api.ppv.st",
} as const;

const JOLPICA = "https://api.jolpi.ca/ergast/f1";

export const ENDPOINTS = {
  seasons: `${JOLPICA}/seasons.json?limit=100`,
  schedule: (year: string) => `${JOLPICA}/${year}.json`,
  driverStandings: (year: string) => `${JOLPICA}/${year}/driverStandings.json`,
  constructorStandings: (year: string) => `${JOLPICA}/${year}/constructorStandings.json`,
  results: (year: string, round: string) => `${JOLPICA}/${year}/${round}/results.json`,
  qualifying: (year: string, round: string) => `${JOLPICA}/${year}/${round}/qualifying.json`,
  practice: (year: string, round: string) => `${JOLPICA}/${year}/${round}/practice.json`,
  sprint: (year: string, round: string) => `${JOLPICA}/${year}/${round}/sprint.json`,
  streams: "https://api.ppv.st/api/streams",
} as const;

/**
 * Stale-after windows (ms). Cached data is shown immediately and refreshed in
 * the background once it is older than its window. Values are the task's:
 * completed seasons >= 24h, season schedule several hours, results 1h,
 * standings 30 min, stream links 30-60s.
 */
export const TTL = {
  completedSeason: 24 * 60 * 60 * 1000,
  seasonSchedule: 3 * 60 * 60 * 1000,
  results: 60 * 60 * 1000,
  standings: 30 * 60 * 1000,
  streams: 45 * 1000,
} as const;

export const currentYear = () => new Date().getFullYear().toString();

/** Schedule/results TTL depends on whether the season is still running. */
export const scheduleTtl = (year: string) =>
  year === currentYear() ? TTL.seasonSchedule : TTL.completedSeason;
export const standingsTtl = (year: string) =>
  year === currentYear() ? TTL.standings : TTL.completedSeason;
export const resultsTtl = (year: string) =>
  year === currentYear() ? TTL.results : TTL.completedSeason;

/** Cache keys, kept in one place so the early-fetch script and the app agree. */
export const KEYS = {
  seasons: "seasons",
  schedule: (year: string) => `schedule:${year}`,
  driverStandings: (year: string) => `driverStandings:${year}`,
  constructorStandings: (year: string) => `constructorStandings:${year}`,
  results: (year: string, round: string) => `results:${year}:${round}`,
  qualifying: (year: string, round: string) => `qualifying:${year}:${round}`,
  practice: (year: string, round: string) => `practice:${year}:${round}`,
  sprint: (year: string, round: string) => `sprint:${year}:${round}`,
  streams: "streams",
} as const;

export const LIMITS = {
  /** Jolpica allows a 4 requests/second burst; keep at least this far apart. */
  burst: 4,
  burstWindowMs: 1000,
  maxRetries: 3,
  backoffBaseMs: 500,
  backoffCapMs: 8000,
  requestTimeoutMs: 12000,
} as const;

/** Name of the global the inline head script stores its in-flight fetches on. */
export const EARLY_GLOBAL = "__f1boxEarly";

/** Persistent-cache namespace. Bumping the version drops all older entries. */
export const CACHE_PREFIX = "f1box";
export const CACHE_VERSION = 3;
