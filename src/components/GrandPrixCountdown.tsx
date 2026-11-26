import { useEffect, useState } from "react";
import {
  getNextRace,
  getCurrentSeason,
  getTimeUntilRace,
  formatRaceDateTime,
  type Race
} from "../lib/jolpica-api";

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
      <div className="page">
        <section className="hero">
          <p className="lead flex items-center gap-2" data-reveal>
            Loading next race…
          </p>
        </section>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="page">
        <section className="hero">
          <span className="countdown-label" data-reveal>RACE</span>
          <h1 className="race-title" data-reveal>No upcoming races</h1>
          <p className="lead" data-reveal>Check back when the new season is announced</p>
        </section>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
        <div style={{ display: "flex", gap: "var(--s1)" }}>
          <span className="countdown-label" data-reveal style={{ "--i": "0" }}>RACE</span>
          {isRaceWeek && (
            <span className="countdown-label" data-reveal style={{ "--i": "1" }}>THIS WEEK</span>
          )}
        </div>
        <h1 className="race-title" data-reveal style={{ "--i": "2" }}>{race.raceName}</h1>
        <p className="countdown-location" data-reveal style={{ "--i": "3", marginTop: "var(--s1)" }}>
          {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
        </p>
        <p className="countdown-date" data-reveal style={{ "--i": "4", marginTop: "var(--s1)" }}>
          {formatRaceDateTime(race.date, race.time, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
        <div
          className="countdown"
          role="timer"
          aria-label={visibleUnits
            .map((it) => `${it.v} ${it.l === "D" ? "days" : it.l === "H" ? "hours" : it.l === "M" ? "minutes" : "seconds"}`)
            .join(", ")}
          style={{ marginTop: "var(--s4)" }}
        >
          {visibleUnits.map((it, index) => (
            <div
              key={it.l}
              className="countdown__unit"
              data-reveal
              style={{ "--i": 5 + index, "--d": `${Math.min(index, 8) * 60}ms` }}
            >
              <span className="countdown__value">{it.v}</span>
              <span className="countdown__label" aria-hidden="true">{it.l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
