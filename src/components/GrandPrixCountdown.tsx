import { useEffect, useState } from "react";
import {
  getNextRace,
  getCurrentSeason,
  getTimeUntilRace,
  formatRaceDateTime,
  type Race
} from "../lib/jolpica-api";
import { AnimateCount } from "./ui/animate-count";
import { MapPin, Loader2 } from "lucide-react";

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
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
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
          <span className="tag rise" data-reveal>RACE</span>
          <h1 className="race-title mt-4 rise" data-reveal>No upcoming races</h1>
          <p className="lead mt-2 rise" data-reveal>Check back when the new season is announced</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="hero">
        <div className="flex gap-2 mb-4 rise" style={{ "--i": "0" }} data-reveal>
          <span className="tag">RACE</span>
          {isRaceWeek && <span className="tag">THIS WEEK</span>}
        </div>
        <h1 className="race-title rise" style={{ "--i": "1" }} data-reveal>{race.raceName}</h1>
        <p className="lead rise" style={{ "--i": "2" }} data-reveal>
          <MapPin className="ic" aria-hidden="true" />
          {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
        </p>
        <p className="fine rise" style={{ "--i": "3" }} data-reveal>
          {formatRaceDateTime(race.date, race.time, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </section>

      <section className="stage" aria-label="Countdown to the next race">
        <div className="stage__panel" data-reveal>
          <div
            className="countdown"
            role="timer"
            aria-label={visibleUnits
              .map((it) => `${it.v} ${it.l === "D" ? "days" : it.l === "H" ? "hours" : it.l === "M" ? "minutes" : "seconds"}`)
              .join(", ")}
          >
            {visibleUnits.map((it) => (
              <div key={it.l} className="countdown__unit">
                <AnimateCount minDigits={2} className="countdown__value">
                  {it.v}
                </AnimateCount>
                <span className="countdown__label" aria-hidden="true">{it.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
