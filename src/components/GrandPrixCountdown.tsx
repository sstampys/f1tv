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
    { v: countdown.days, l: "D", name: "days", hidden: countdown.days === 0 },
    { v: countdown.hours, l: "H", name: "hours", hidden: countdown.days === 0 && countdown.hours === 0 },
    { v: countdown.minutes, l: "M", name: "minutes", hidden: countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 },
    { v: countdown.seconds, l: "S", name: "seconds", hidden: false },
  ].filter((it) => !it.hidden);

  const isRaceWeek = countdown.days <= 7;

  if (loading) {
    return (
      <section className="rows">
        <p className="page-container mute" data-reveal>Loading next race…</p>
      </section>
    );
  }

  if (!race) {
    return (
      <section className="rows">
        <div className="page-container">
          <p className="label-line" data-reveal>Race</p>
          <div className="facts">
            <h1 className="statement" data-reveal>No upcoming races</h1>
            <p className="mute" data-reveal>Check back when the new season is announced</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rows" aria-labelledby="countdown-title">
      <div className="page-container">
        <p className="label-line" data-reveal>
          Race{isRaceWeek && " · This week"}
        </p>
        <div className="facts">
          <h1 id="countdown-title" className="statement" data-reveal>{race.raceName}</h1>
          <p className="mute" data-reveal>
            {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
          </p>
          <p className="mute" data-reveal>
            {formatRaceDateTime(race.date, race.time, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
      <div
        className="page-container countdown"
        role="timer"
        aria-label={visibleUnits.map((it) => `${it.v} ${it.name}`).join(", ")}
      >
        {visibleUnits.map((it) => (
          <div key={it.l} className="countdown__unit">
            <span className="countdown__value" data-reveal>{String(it.v).padStart(2, "0")}</span>
            <span className="countdown__label" aria-hidden="true" data-reveal>{it.l}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
