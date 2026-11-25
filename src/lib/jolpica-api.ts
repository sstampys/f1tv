/**
 * Jolpica-F1 API Client
 * Free, no-auth F1 data API (community-maintained Ergast successor)
 * Base: https://api.jolpi.ca/ergast/f1/
 * 
 * Caching: localStorage with 30-minute TTL for standings/results,
 * 1-hour TTL for schedule (changes rarely)
 */

const API_BASE = "https://api.jolpi.ca/ergast/f1";
const CACHE_PREFIX = "f1box_";
const CACHE_TTL = {
  standings: 30 * 60 * 1000,   // 30 minutes
  schedule: 60 * 60 * 1000,    // 1 hour
  results: 30 * 60 * 1000,     // 30 minutes
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCache<T>(key: string): T | null {
  // Skip cache on server (no localStorage)
  if (typeof window === "undefined" || typeof localStorage === "undefined") return null;

  try {
    const entry = localStorage.getItem(CACHE_PREFIX + key);
    if (!entry) return null;
    const parsed: CacheEntry<T> = JSON.parse(entry);
    const age = Date.now() - parsed.timestamp;
    const ttl = CACHE_TTL[key.split("_")[0] as keyof typeof CACHE_TTL] || CACHE_TTL.standings;
    if (age > ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T): void {
  // Skip cache on server
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;

  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Ignore quota errors
  }
}

async function fetchWithCache<T>(key: string, url: string, ttlKey: keyof typeof CACHE_TTL = "standings"): Promise<T> {
  const cached = getCache<T>(key);
  if (cached) return cached;

  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "F1Box/1.0 (+https://f1box.org)"
    },
    // Use force-cache for 5 min browser cache as additional layer
    cache: "force-cache"
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  setCache(key, data);
  return data;
}

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
  time: string;
  FirstPractice?: { date: string; time: string };
  SecondPractice?: { date: string; time: string };
  ThirdPractice?: { date: string; time: string };
  Qualifying?: { date: string; time: string };
  Sprint?: { date: string; time: string };
  SprintQualifying?: { date: string; time: string };
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
    Time: { time: string; AverageSpeed?: { units: string; speed: string } };
  };
}

// ============================================
// API Functions
// ============================================

/** Get all available seasons */
export async function getSeasons(): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await fetchWithCache("seasons", `${API_BASE}/seasons.json?limit=100`, "schedule");
  return data.MRData.SeasonTable.Seasons.map((s: { season: string }) => s.season).reverse();
}

/** Get driver standings for a season (defaults to latest) */
export async function getDriverStandings(year?: string): Promise<DriverStanding[]> {
  const targetYear = year || new Date().getFullYear().toString();
  const key = `standings_${targetYear}`;
  const url = `${API_BASE}/${targetYear}/driverStandings.json`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await fetchWithCache(key, url, "standings");
  const lists = data.MRData.StandingsTable.StandingsLists;
  return lists[lists.length - 1]?.DriverStandings || [];
}

/** Get constructor standings for a season */
export async function getConstructorStandings(year?: string): Promise<ConstructorStanding[]> {
  const targetYear = year || new Date().getFullYear().toString();
  const key = `constructor_standings_${targetYear}`;
  const url = `${API_BASE}/${targetYear}/constructorStandings.json`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await fetchWithCache(key, url, "standings");
  const lists = data.MRData.StandingsTable.StandingsLists;
  return lists[lists.length - 1]?.ConstructorStandings || [];
}

/** Get full race schedule for a season */
export async function getRaceSchedule(year?: string): Promise<Race[]> {
  const targetYear = year || new Date().getFullYear().toString();
  const key = `schedule_${targetYear}`;
  const url = `${API_BASE}/${targetYear}.json`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await fetchWithCache(key, url, "schedule");
  return data.MRData.RaceTable.Races || [];
}

/** Get race results for a specific round */
export async function getRaceResults(year: string, round: string): Promise<RaceResult[]> {
  const key = `results_${year}_${round}`;
  const url = `${API_BASE}/${year}/${round}/results.json`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await fetchWithCache(key, url, "results");
  const races = data.MRData.RaceTable.Races;
  return races[0]?.Results || [];
}

/** Get the next upcoming race */
export async function getNextRace(year?: string): Promise<Race | null> {
  const schedule = await getRaceSchedule(year);
  const now = new Date();
  return schedule.find(race => new Date(`${race.date}T${normalizeTime(race.time)}Z`) > now) || null;
}

/** Get the most recent completed race */
export async function getLastRace(year?: string): Promise<Race | null> {
  const schedule = await getRaceSchedule(year);
  const now = new Date();
  const past = schedule.filter(race => new Date(`${race.date}T${normalizeTime(race.time)}Z`) <= now);
  return past[past.length - 1] || null;
}

/** Get current season (latest available) */
export async function getCurrentSeason(): Promise<string> {
  const seasons = await getSeasons();
  return seasons[0] || new Date().getFullYear().toString();
}

// ============================================
// Helpers
// ============================================

/** Convert UTC race date/time to user's local timezone */
export function formatRaceDateTime(date: string, time: string, options: Intl.DateTimeFormatOptions = {}): string {
  // API returns time like "04:00:00Z" - strip trailing Z if present to avoid double-Z
  const cleanTime = time.endsWith("Z") ? time.slice(0, -1) : time;
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

/** Normalize API time (strips trailing Z if present) */
function normalizeTime(time: string): string {
  return time.endsWith("Z") ? time.slice(0, -1) : time;
}

/** Get time until race (for countdown) */
export function getTimeUntilRace(date: string, time: string): {
  days: number; hours: number; minutes: number; seconds: number; totalMs: number; isPast: boolean;
} {
  const raceDate = new Date(`${date}T${normalizeTime(time)}Z`);
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
export function isRaceCompleted(date: string, time: string): boolean {
  const raceDate = new Date(`${date}T${normalizeTime(time)}Z`);
  return !isNaN(raceDate.getTime()) && raceDate <= new Date();
}

/** Clear all F1 caches (for testing) */
export function clearF1Cache(): void {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) localStorage.removeItem(key);
  });
}
