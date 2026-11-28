/**
 * Jolpica-F1 API client (browser only).
 *
 * Every request goes through the shared browser data layer: persistent
 * stale-while-revalidate cache, in-flight de-duplication, a limiter that keeps
 * the app under the API's burst limit and retry with backoff. No server-side
 * fetching anywhere. Values live in lib/data/config.
 */

import { ENDPOINTS, KEYS, TTL, scheduleTtl, standingsTtl, resultsTtl, currentYear } from "./data/config";
import { request } from "./data/client";
import { readEntry, writeEntry } from "./data/store";
import type { Resource } from "./data/use-resource";

// ============================================
// Types (matching Ergast/Jolpica response structure)
// ============================================

export interface Driver {
  driverId: string;
  permanentNumber: string;
  code: string;
  url: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
}

export interface Constructor {
  constructorId: string;
  url: string;
  name: string;
  nationality: string;
}

export interface DriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

export interface ConstructorStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: Constructor;
}

export interface Race {
  season: string;
  round: string;
  url: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    url: string;
    circuitName: string;
    Location: {
      lat: string;
      long: string;
      locality: string;
      country: string;
    };
  };
  date: string;
  // Older seasons (and some races) publish no start time at all.
  time?: string;
  FirstPractice?: { date: string; time?: string };
  SecondPractice?: { date: string; time?: string };
  ThirdPractice?: { date: string; time?: string };
  Qualifying?: { date: string; time?: string };
  Sprint?: { date: string; time?: string };
  SprintQualifying?: { date: string; time?: string };
}

export interface RaceResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: Driver;
  Constructor: Constructor;
  grid: string;
  laps: string;
  status: string;
  Time?: { millis: string; time: string };
  FastestLap?: {
    rank: string;
    lap: string;
    Time: { time: string; averageSpeed?: { units: string; speed: string } };
  };
}

export interface QualifyingResult {
  number: string;
  position: string;
  positionText: string;
  Driver: Driver;
  Constructor: Constructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface PracticeResult {
  number: string;
  position: string;
  positionText: string;
  Driver: Driver;
  Constructor: Constructor;
  time?: string;
  laps?: string;
}

export interface SprintResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: Driver;
  Constructor: Constructor;
  grid: string;
  laps: string;
  status: string;
  Time?: { millis: string; time: string };
  FastestLap?: {
    rank: string;
    lap: string;
    Time: { time: string; averageSpeed?: { units: string; speed: string } };
  };
}

// ============================================
// Parsers (raw Jolpica JSON -> app shape)
// ============================================

/* eslint-disable @typescript-eslint/no-explicit-any */
const parseSeasons = (raw: any): string[] =>
  raw.MRData.SeasonTable.Seasons.map((s: { season: string }) => s.season).reverse();

const parseSchedule = (raw: any): Race[] => raw.MRData.RaceTable.Races || [];

const parseDriverStandings = (raw: any): DriverStanding[] => {
  const lists = raw.MRData.StandingsTable.StandingsLists;
  return lists[lists.length - 1]?.DriverStandings || [];
};

const parseConstructorStandings = (raw: any): ConstructorStanding[] => {
  const lists = raw.MRData.StandingsTable.StandingsLists;
  return lists[lists.length - 1]?.ConstructorStandings || [];
};

const parseResults = (raw: any): RaceResult[] => raw.MRData.RaceTable.Races[0]?.Results || [];

const parseQualifying = (raw: any): QualifyingResult[] => raw.MRData.RaceTable.Races[0]?.QualifyingResults || [];

const parsePractice = (raw: any): PracticeResult[] => raw.MRData.RaceTable.Races[0]?.PracticeResults || [];

const parseSprint = (raw: any): SprintResult[] => raw.MRData.RaceTable.Races[0]?.SprintResults || [];
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================
// Resources (consumed by useResource and the prefetcher)
// ============================================

export const seasonsRes: Resource<string[]> = {
  key: KEYS.seasons,
  url: ENDPOINTS.seasons,
  ttl: TTL.completedSeason,
  parse: parseSeasons,
};

export const scheduleRes = (year: string): Resource<Race[]> => ({
  key: KEYS.schedule(year),
  url: ENDPOINTS.schedule(year),
  ttl: scheduleTtl(year),
  parse: parseSchedule,
});

export const driverStandingsRes = (year: string): Resource<DriverStanding[]> => ({
  key: KEYS.driverStandings(year),
  url: ENDPOINTS.driverStandings(year),
  ttl: standingsTtl(year),
  parse: parseDriverStandings,
});

export const constructorStandingsRes = (year: string): Resource<ConstructorStanding[]> => ({
  key: KEYS.constructorStandings(year),
  url: ENDPOINTS.constructorStandings(year),
  ttl: standingsTtl(year),
  parse: parseConstructorStandings,
});

export const raceResultsRes = (year: string, round: string): Resource<RaceResult[]> => ({
  key: KEYS.results(year, round),
  url: ENDPOINTS.results(year, round),
  ttl: resultsTtl(year),
  parse: parseResults,
});

export const qualifyingRes = (year: string, round: string): Resource<QualifyingResult[]> => ({
  key: KEYS.qualifying(year, round),
  url: ENDPOINTS.qualifying(year, round),
  ttl: resultsTtl(year),
  parse: parseQualifying,
});

export const practiceRes = (year: string, round: string): Resource<PracticeResult[]> => ({
  key: KEYS.practice(year, round),
  url: ENDPOINTS.practice(year, round),
  ttl: resultsTtl(year),
  parse: parsePractice,
});

export const sprintRes = (year: string, round: string): Resource<SprintResult[]> => ({
  key: KEYS.sprint(year, round),
  url: ENDPOINTS.sprint(year, round),
  ttl: resultsTtl(year),
  parse: parseSprint,
});

// ============================================
// Cached loaders (imperative callers and prefetch)
// ============================================

/**
 * Resolve a resource from cache or network. Fresh cache short-circuits the
 * network entirely; if a revalidation fails but a stale value exists, the stale
 * value is returned so a populated page is never blanked.
 */
async function load<T>(res: Resource<T>): Promise<T> {
  const entry = readEntry<T>(res.key);
  if (entry && Date.now() - entry.t < res.ttl) return entry.d;
  try {
    const data = await request<unknown>(res.key, res.url).then(res.parse);
    writeEntry(res.key, data);
    return data;
  } catch (error) {
    if (entry) return entry.d;
    throw error;
  }
}

export const getSeasons = (): Promise<string[]> => load(seasonsRes);
export const getRaceSchedule = (year?: string): Promise<Race[]> => load(scheduleRes(year || currentYear()));
export const getDriverStandings = (year?: string): Promise<DriverStanding[]> =>
  load(driverStandingsRes(year || currentYear()));
export const getConstructorStandings = (year?: string): Promise<ConstructorStanding[]> =>
  load(constructorStandingsRes(year || currentYear()));
export const getRaceResults = (year: string, round: string): Promise<RaceResult[]> =>
  load(raceResultsRes(year, round));

/** Get current season (latest published), falling back to the calendar year. */
export async function getCurrentSeason(): Promise<string> {
  const seasons = await getSeasons();
  return seasons[0] || currentYear();
}

/** The instant a race starts: its published time, or the end of its date (UTC). */
function raceStart(date: string, time?: string | null): Date {
  const clean = normalizeTime(time);
  return new Date(`${date}T${clean || "23:59:59"}Z`);
}

/** The first race in a schedule whose start is still in the future. */
export function findNextRace(schedule: Race[]): Race | null {
  const now = new Date();
  return (
    schedule.find((race) => {
      const start = raceStart(race.date, race.time);
      return !isNaN(start.getTime()) && start > now;
    }) || null
  );
}

/** Get the next upcoming race for a season's schedule. */
export async function getNextRace(year?: string): Promise<Race | null> {
  return findNextRace(await getRaceSchedule(year));
}

/** Get the most recent completed race for a season's schedule. */
export async function getLastRace(year?: string): Promise<Race | null> {
  const schedule = await getRaceSchedule(year);
  const now = new Date();
  const past = schedule.filter((race) => {
    const start = raceStart(race.date, race.time);
    return !isNaN(start.getTime()) && start <= now;
  });
  return past[past.length - 1] || null;
}

// ============================================
// Helpers
// ============================================

/** Convert UTC race date/time to user's local timezone. Date only when no time. */
export function formatRaceDateTime(
  date: string,
  time?: string | null,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const cleanTime = normalizeTime(time);
  if (!cleanTime) {
    // No start time published: show the date alone. Format in UTC at midday so
    // the calendar day never shifts into the previous/next one.
    const day = new Date(`${date}T12:00:00Z`);
    if (isNaN(day.getTime())) return "Invalid date";
    return day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC", ...options });
  }
  const utcString = `${date}T${cleanTime}Z`;
  const raceDate = new Date(utcString);
  if (isNaN(raceDate.getTime())) return "Invalid date";
  return raceDate.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...options,
  });
}

/** Normalize API time (strips trailing Z if present); null when absent. */
function normalizeTime(time?: string | null): string | null {
  if (!time) return null;
  return time.endsWith("Z") ? time.slice(0, -1) : time;
}

/** The sessions a race weekend has results for. */
export type SessionKey = "race" | "qualifying" | "practice" | "sprint";

/**
 * When a session runs.
 *
 * The schedule publishes the date — and, for recent seasons, the start time —
 * of every session of the weekend, so the header can show the timestamp of the
 * session that is on screen instead of always the race's. Older seasons
 * published dates only; the time is then left out.
 */
export function sessionDateTime(
  race: Race,
  session: SessionKey,
): { date: string; time?: string } | null {
  switch (session) {
    case "qualifying":
      return race.Qualifying ? { date: race.Qualifying.date, time: race.Qualifying.time } : null;
    case "sprint":
      // A sprint weekend: the sprint race, or its qualifying session when the
      // schedule only lists that one.
      if (race.Sprint) return { date: race.Sprint.date, time: race.Sprint.time };
      if (race.SprintQualifying) {
        return { date: race.SprintQualifying.date, time: race.SprintQualifying.time };
      }
      return null;
    case "practice":
      // The practice results are the last practice session of the weekend.
      return race.ThirdPractice ?? race.SecondPractice ?? race.FirstPractice ?? null;
    default:
      return { date: race.date, time: race.time };
  }
}

/** Get time until race (for countdown) */
export function getTimeUntilRace(date: string, time?: string | null): {
  days: number; hours: number; minutes: number; seconds: number; totalMs: number; isPast: boolean;
} {
  const raceDate = raceStart(date, time);
  const now = new Date();
  const diff = raceDate.getTime() - now.getTime();

  if (diff <= 0 || isNaN(raceDate.getTime())) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isPast: true };
  }

  const totalMs = diff;
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, totalMs, isPast: false };
}

/** Check if race is completed */
export function isRaceCompleted(date: string, time?: string | null): boolean {
  const raceDate = raceStart(date, time);
  return !isNaN(raceDate.getTime()) && raceDate <= new Date();
}

/** Clear all F1 caches (for testing) */
export function clearF1Cache(): void {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("f1box:")) localStorage.removeItem(key);
    });
  } catch {
    // ignore
  }
}
