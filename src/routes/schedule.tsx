import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  getRaceSchedule,
  getNextRace,
  getSeasons,
  formatRaceDateTime,
  isRaceCompleted,
  type Race
} from "@/lib/jolpica-api";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Race Schedule — F1Box" },
      { name: "description", content: "Formula 1 race calendar with dates and circuits." },
      { property: "og:title", content: "Race Schedule — F1Box" },
      { property: "og:description", content: "Formula 1 race calendar with dates and circuits." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.f1box.org/schedule" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://www.f1box.org/schedule" },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { data: seasons } = useQuery({ queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000 });
  const currentSeason = seasons?.[0];
  return currentSeason ? <ScheduleSection currentSeason={currentSeason} /> : <div className="page" />;
}

export function ScheduleSection({ currentSeason }: { currentSeason: string }) {
  const [season, setSeason] = useState<string>(currentSeason);

  const { data: seasons, isLoading: seasonsLoading } = useQuery({
    queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000,
  });

  const { data: schedule, isLoading: scheduleLoading, error: scheduleError } = useQuery({
    queryKey: ["schedule", season], queryFn: () => getRaceSchedule(season), enabled: !!season, staleTime: 60 * 60 * 1000,
  });

  const { data: nextRace } = useQuery({
    queryKey: ["nextRace", season], queryFn: () => getNextRace(season), enabled: !!season, staleTime: 60 * 60 * 1000,
  });

  return (
    <div className="page">
      <section id="schedule" className="rows">
        <div className="page-container head">
          <h1 data-reveal>Race Schedule</h1>
          {!seasonsLoading && seasons && (
            <select
              className="control"
              aria-label="Season"
              value={season}
              onChange={(event) => setSeason(event.target.value)}
              data-reveal
            >
              {seasons.map((s) => (
                <option key={s} value={s}>{s} Season</option>
              ))}
            </select>
          )}
        </div>

        {scheduleLoading && !schedule ? null : scheduleError ? (
          <Notice title="Unable to load schedule" message="Failed to load schedule. Please try again." retry />
        ) : schedule && schedule.length > 0 ? (
          <RaceCalendar races={schedule} nextRace={nextRace ?? null} />
        ) : (
          <Notice title="No Races Scheduled" message="No races scheduled for this season." />
        )}
      </section>
    </div>
  );
}

const byDate = (a: Race, b: Race) => {
  const da = new Date(`${a.date}T${a.time || "00:00:00"}`);
  const db = new Date(`${b.date}T${b.time || "00:00:00"}`);
  return da.getTime() - db.getTime();
};

function RaceCalendar({ races, nextRace }: { races: Race[]; nextRace: Race | null }) {
  const nextRaceRound = nextRace?.round;
  const [showPast, setShowPast] = useState(false);

  const upcomingRaces = useMemo(
    () => [...races].filter((race) => !isRaceCompleted(race.date, race.time)).sort(byDate),
    [races],
  );

  const pastRaces = useMemo(
    () => [...races].filter((race) => isRaceCompleted(race.date, race.time)).sort((a, b) => byDate(b, a)),
    [races],
  );

  return (
    <>
      {upcomingRaces.map((race) => (
        <RaceRow key={race.round} race={race} isNext={race.round === nextRaceRound} isCompleted={false} />
      ))}

      {pastRaces.length > 0 && (
        <div className="page-container">
          <button
            type="button"
            className="control"
            onClick={() => setShowPast(!showPast)}
            aria-expanded={showPast}
            aria-controls="past-races"
            data-reveal
          >
            {showPast ? "Hide Past Races" : "Show Past Races"}
          </button>
        </div>
      )}

      {showPast && (
        <div id="past-races" className="contents">
          {pastRaces.map((race) => (
            <RaceRow key={race.round} race={race} isNext={race.round === nextRaceRound} isCompleted />
          ))}
        </div>
      )}
    </>
  );
}

function RaceRow({ race, isNext, isCompleted }: { race: Race; isNext: boolean; isCompleted: boolean }) {
  const status = isCompleted ? "Completed" : isNext ? "This weekend" : null;
  const when = formatRaceDateTime(race.date, race.time, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="row">
      <p className="row__label" aria-label={`Round ${race.round}`} data-reveal>{race.round}</p>
      <div className="row__body">
        <p data-reveal>
          {race.raceName}
          {status && <span className="mute"> · {status}</span>}
        </p>
        <p className="mute" data-reveal>
          {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country} · {when}
        </p>
      </div>
    </div>
  );
}

function Notice({ title, message, retry }: { title: string; message: string; retry?: boolean }) {
  return (
    <div className="page-container stack-tight">
      <p data-reveal>{title}</p>
      <p className="mute" data-reveal>{message}</p>
      {retry && (
        <p data-reveal>
          <button type="button" className="control" onClick={() => window.location.reload()}>Try Again</button>
        </p>
      )}
    </div>
  );
}
