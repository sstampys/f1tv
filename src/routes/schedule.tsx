import { createFileRoute } from "@tanstack/react-router";
import {
  seasonsRes,
  scheduleRes,
  findNextRace,
  formatRaceDateTime,
  isRaceCompleted,
  type Race
} from "@/lib/jolpica-api";
import { useState, useMemo, Component, type ReactNode } from "react";
import { useResource } from "@/lib/data/use-resource";
import { ENDPOINTS, KEYS, TTL, currentYear, scheduleTtl } from "@/lib/data/config";
import { earlyFetchScript } from "@/lib/data/early";
import { LanguageSelectorDropdown } from "@/components/ui/language-selector-dropdown";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule" },
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
    scripts: [
      {
        children: earlyFetchScript([
          { url: ENDPOINTS.seasons, key: KEYS.seasons, ttl: TTL.completedSeason },
          { url: ENDPOINTS.schedule(currentYear()), key: KEYS.schedule(currentYear()), ttl: scheduleTtl(currentYear()) },
        ]),
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const seasons = useResource(seasonsRes);
  const currentSeason = seasons.data?.[0];
  return currentSeason ? <ScheduleSection currentSeason={currentSeason} /> : <div className="page" />;
}

export function ScheduleSection({ currentSeason }: { currentSeason: string }) {
  const [season, setSeason] = useState<string>(currentSeason);

  const seasons = useResource(seasonsRes);
  const schedule = useResource(scheduleRes(season));

  // The next race is derived from the schedule already in hand — no extra request.
  // Only the current season can have one; a finished season has no next race.
  const nextRace = useMemo(
    () => (season === currentSeason && schedule.data ? findNextRace(schedule.data) : null),
    [schedule.data, season, currentSeason],
  );

  return (
    <div className="page">
      <section id="schedule" className="rows">
        <div className="page-container head">
          <h1 data-reveal>Race Schedule</h1>
          {seasons.data && (
            <LanguageSelectorDropdown
              value={season}
              options={seasons.data.map((s) => ({ value: s, label: `${s} Season` }))}
              onChange={setSeason}
              ariaLabel="Season"
              align="end"
            />
          )}
        </div>

        <ScheduleBoundary key={season}>
          {!schedule.data && !schedule.error ? null : schedule.error ? (
            <Notice title="Unable to load schedule" message="Failed to load schedule. Please try again." retry />
          ) : schedule.data && schedule.data.length > 0 ? (
            <RaceCalendar
              key={season}
              races={schedule.data}
              nextRace={nextRace}
              isCurrentSeason={season === currentSeason}
            />
          ) : (
            <Notice title="No Races Scheduled" message="No races scheduled for this season." />
          )}
        </ScheduleBoundary>
      </section>
    </div>
  );
}

/**
 * Keeps a bad season's data from taking the page down: the heading and the
 * season selector live outside this boundary, so the user can always switch
 * away. Keyed by season, so choosing another season retries cleanly.
 */
class ScheduleBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="page-container stack-tight">
          <p>Unable to display this season</p>
          <p className="mute">The data for this season could not be shown. Pick another season above.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const byDate = (a: Race, b: Race) => {
  const da = new Date(`${a.date}T${a.time || "00:00:00"}`);
  const db = new Date(`${b.date}T${b.time || "00:00:00"}`);
  return da.getTime() - db.getTime();
};

function RaceCalendar({
  races,
  nextRace,
  isCurrentSeason,
}: {
  races: Race[];
  nextRace: Race | null;
  isCurrentSeason: boolean;
}) {
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

  // An older season is entirely in the past, so there is nothing to toggle: the
  // whole calendar shows at once, in date order, with no control.
  const wholeSeason = useMemo(() => (isCurrentSeason ? null : [...races].sort(byDate)), [races, isCurrentSeason]);

  if (wholeSeason) {
    return (
      <>
        {wholeSeason.map((race) => (
          <RaceRow key={race.round} race={race} isNext={race.round === nextRaceRound} isCompleted />
        ))}
      </>
    );
  }

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

  if (isCompleted) {
    return (
      <Link to={`/results/${race.season}/${race.round}`} className="row link-row" data-reveal>
        <p className="row__label" aria-label={`Round ${race.round}`}>{race.round}</p>
        <div className="row__body">
          <p>
            {race.raceName}
            <span className="row__arrow" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h6M9 4l3 4-3 4"/></svg>
            </span>
          </p>
          <p className="mute">
            {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country} · {when}
          </p>
        </div>
      </Link>
    );
  }

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
