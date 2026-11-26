import { memo, useEffect, useState } from "react";
import {
  seasonsRes,
  scheduleRes,
  findNextRace,
  getTimeUntilRace,
  formatRaceDateTime,
  type Race
} from "../lib/jolpica-api";
import { useResource } from "../lib/data/use-resource";
import { currentYear } from "../lib/data/config";

const unitsFor = (race: Race) => {
  const t = getTimeUntilRace(race.date, race.time);
  return [
    { v: t.days, l: "D", name: "days", hidden: t.days === 0 },
    { v: t.hours, l: "H", name: "hours", hidden: t.days === 0 && t.hours === 0 },
    { v: t.minutes, l: "M", name: "minutes", hidden: t.days === 0 && t.hours === 0 && t.minutes === 0 },
    { v: t.seconds, l: "S", name: "seconds", hidden: false },
  ].filter((it) => !it.hidden);
};

/*
 * The only component that ticks. It owns the per-second state, so the label,
 * title, location and date above it never re-render, and the first render
 * already holds the real values: every unit mounts in the same commit.
 */
const Ticker = memo(function Ticker({ race }: { race: Race }) {
  const [units, setUnits] = useState(() => unitsFor(race));

  useEffect(() => {
    setUnits(unitsFor(race));
    const intervalId = setInterval(() => setUnits(unitsFor(race)), 1000);
    return () => clearInterval(intervalId);
  }, [race]);

  return (
    <div
      className="page-container countdown"
      role="timer"
      aria-label={units.map((it) => `${it.v} ${it.name}`).join(", ")}
    >
      {units.map((it) => (
        <div key={it.l} className="countdown__unit">
          <span className="countdown__value" data-reveal>{String(it.v).padStart(2, "0")}</span>
          <span className="countdown__label" aria-hidden="true" data-reveal>{it.l}</span>
        </div>
      ))}
    </div>
  );
});

export function GrandPrixCountdown() {
  // Next race is derived entirely from cached schedule data — no polling and no
  // per-tick network activity. Both resources are SWR-cached (the early inline
  // script usually started them before this code runs).
  const seasons = useResource(seasonsRes);
  const year = seasons.data?.[0] ?? currentYear();
  const schedule = useResource(scheduleRes(year));
  const races = schedule.data;

  if (!races && !schedule.error) {
    // Nothing to show yet: an empty frame, matching the server render exactly.
    return <section className="rows" />;
  }

  const race = races ? findNextRace(races) : null;

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

  const isRaceWeek = getTimeUntilRace(race.date, race.time).days <= 7;

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
      <Ticker race={race} />
    </section>
  );
}
