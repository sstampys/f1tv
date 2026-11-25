import { useEffect, useState } from "react";
import {
  getNextRace,
  getCurrentSeason,
  getTimeUntilRace,
  formatRaceDateTime,
  type Race
} from "../lib/jolpica-api";
import { AnimateCount } from "./ui/animate-count";
import { Calendar, MapPin, Flag, Loader2 } from "lucide-react";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function GrandPrixCountdown() {
  const [race, setRace] = useState<Race | null>(null);
  const [countdown, setCountdown] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRace = async () => {
      try {
        const season = await getCurrentSeason();
        const nextRace = await getNextRace(season);
        setRace(nextRace);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching next race:", error);
        setLoading(false);
      }
    };

    fetchRace();
    const intervalId = setInterval(fetchRace, 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!race) return;
    const updateCountdown = () => {
      const t = getTimeUntilRace(race.date, race.time);
      setCountdown({ days: t.days, hours: t.hours, minutes: t.minutes, seconds: t.seconds });
    };
    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
  }, [race]);

  const visibleUnits = [
    { v: countdown.days, l: "D", hidden: countdown.days === 0 },
    { v: countdown.hours, l: "H", hidden: countdown.days === 0 && countdown.hours === 0 },
    { v: countdown.minutes, l: "M", hidden: countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 },
    { v: countdown.seconds, l: "S", hidden: false },
  ].filter((it) => !it.hidden);

  const isRaceWeek = countdown.days <= 7;

  if (loading) {
    return (
      <div className="relative min-h-screen bg-ground">
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-ink-3 mb-4" />
            <p className="text-ink-2">Loading next race…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="relative min-h-screen bg-ground">
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            <Flag className="w-12 h-12 text-ink-3 mb-4" />
            <p className="text-ink text-lg font-medium">No upcoming races</p>
            <p className="text-ink-2 mt-2">Check back when the new season is announced</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-ground">
      <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center py-20 md:py-28">
        <div className="flex w-full max-w-3xl flex-col items-center justify-center px-6 text-center">

          {/* Race Info */}
          <div className="mb-10 md:mb-12 w-full max-w-xl mx-auto rise" style={{ "--i": "0" }}>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="tag bg-ink text-white text-sm">
                RACE
              </span>
              {isRaceWeek && (
                <span className="tag bg-red-500 border-red-500 text-white text-sm animate-pulse">
                  THIS WEEK
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold text-ink mb-3 tracking-tight">{race.raceName}</h1>
            <p className="text-ink-2 text-base md:text-lg mb-6 flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
              {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
            </p>
            <p className="text-ink-3 text-sm md:text-base">
              {formatRaceDateTime(race.date, race.time, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {/* Countdown */}
          <div
            className="flex items-start justify-center gap-4 md:gap-8"
            role="timer"
            aria-label={visibleUnits
              .map((it) => `${it.v} ${it.l === "D" ? "days" : it.l === "H" ? "hours" : it.l === "M" ? "minutes" : "seconds"}`)
              .join(", ")}
          >
            {visibleUnits.map((it, idx) => (
              <div key={it.l} className="flex flex-col items-center rise" style={{ "--i": String(idx + 1) }}>
                <div className="relative">
                  <AnimateCount minDigits={2} className="h-16 md:h-24 lg:h-28 min-w-[4rem] md:min-w-[6rem] lg:min-w-[7rem] font-display text-4xl md:text-6xl lg:text-7xl font-bold text-ink tabular-nums">
                    {it.v}
                  </AnimateCount>
                </div>
                <span className="font-display text-sm md:text-base lg:text-lg text-ink-2 mt-4 font-semibold uppercase tracking-wider" aria-hidden="true">{it.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}