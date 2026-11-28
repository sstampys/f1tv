import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  seasonsRes,
  scheduleRes,
  findNextRace,
  formatRaceDateTime,
  isRaceCompleted,
  type Race
} from "@/lib/jolpica-api";
import { useState, useMemo, useRef, useEffect, Component, type ReactNode } from "react";
import { useResource } from "@/lib/data/use-resource";
import { ENDPOINTS, KEYS, TTL, currentYear, scheduleTtl } from "@/lib/data/config";
import { earlyFetchScript } from "@/lib/data/early";
import { loadErrorMessage, useLoadTimeout } from "@/lib/data/load-error";
import { SystemSelect } from "@/components/ui/system-select";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { LEAF, fadeOutList } from "@/lib/reveal";
import { LoadingSpinner } from "@/components/ui/loader-circle-icon";
import { ControlButton } from "@/components/ui/control-button";
import { asSeason, setSeason, useSeason } from "@/lib/season";

export const Route = createFileRoute("/schedule")({
  // The season travels in the URL, so it survives a reload, a shared link and
  // the browser's back button.
  validateSearch: (search: Record<string, unknown>): { season?: string } => {
    const season = asSeason(search.season);
    return season ? { season } : {};
  },
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
  const search = Route.useSearch();
  // The URL is the source of truth, but only a real year counts: a hand
  // typed ?season=abc falls back to the season the visitor picked before.
  const seasonParam = asSeason(search.season);
  const navigate = useNavigate();
  // The season the visitor last chose, for routes opened without a parameter.
  const remembered = useSeason();
  const season = seasonParam ?? remembered ?? currentSeason;
  const listRef = useRef<HTMLDivElement>(null);

  // A season in the URL is remembered, so the navigation pill and the routes
  // without a selector carry it along. A value that is not a year is dropped
  // and the address bar is corrected to the season on screen.
  useEffect(() => {
    if (seasonParam) {
      setSeason(seasonParam);
      return;
    }
    if (!season) return;
    if (search.season !== undefined || (remembered && remembered !== currentSeason)) {
      navigate({ to: "/schedule", search: { season }, replace: true });
    }
  }, [seasonParam, remembered, currentSeason, search.season, season, navigate]);

  const swapSeason = (next: string) => {
    void fadeOutList(listRef.current).then(() => {
      navigate({ to: "/schedule", search: { season: next }, replace: true });
    });
  };

  const seasons = useResource(seasonsRes);
  const schedule = useResource(scheduleRes(season));
  // The schedule has been waiting longer than the shared timeout: the spinner
  // has said enough and the page owes the visitor an explanation.
  const { slow, error: attemptError } = useLoadTimeout(
    scheduleRes(season).key,
    !schedule.data && !schedule.error,
  );

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
            <SystemSelect
              value={season}
              options={seasons.data.map((s) => ({ value: s, label: `${s} Season` }))}
              onChange={swapSeason}
              ariaLabel="Season"
            />
          )}
        </div>

        <div ref={listRef} className="contents">
        <ScheduleBoundary key={season}>
          {!schedule.data && !schedule.error ? (
            <div className="page-container">
              <LoadingSpinner className="mute" />
              {slow && (
                <Notice title="Still loading" message={loadErrorMessage(attemptError, "the schedule")} retry />
              )}
            </div>
          ) : schedule.error ? (
            <Notice title="Unable to load schedule" message={loadErrorMessage(schedule.error, "the schedule")} retry />
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
        </div>
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
  const [pastMounted, setPastMounted] = useState(false);
  const pastRef = useRef<HTMLDivElement>(null);
  const fadeToken = useRef(0);

  // The control answers at once: its label flips on the same frame. Only the
  // list itself is delayed — it fades out before unmounting, and fades in as it
  // mounts, so both directions read like a page change.
  const togglePast = () => {
    if (!showPast) {
      fadeToken.current += 1;
      setShowPast(true);
      setPastMounted(true);
      return;
    }
    const token = ++fadeToken.current;
    setShowPast(false);
    // The rows rose into place when the list opened, so they leave the same
    // way: fade out while drifting up, matching the reveal distance.
    void fadeOutList(pastRef.current, LEAF, 1).then(() => {
      if (fadeToken.current === token) setPastMounted(false);
    });
  };

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
            onClick={togglePast}
            aria-expanded={showPast}
            aria-controls="past-races"
            data-reveal
          >
            {showPast ? "Hide Past Races" : "Show Past Races"}
          </button>
        </div>
      )}

      {pastMounted && (
        <div id="past-races" className="contents" ref={pastRef}>
          {pastRaces.map((race) => (
            <RaceRow key={race.round} race={race} isNext={race.round === nextRaceRound} isCompleted dropDown />
          ))}
        </div>
      )}
    </>
  );
}

function RaceRow({
  race,
  isNext,
  isCompleted,
  dropDown = false,
}: {
  race: Race;
  isNext: boolean;
  isCompleted: boolean;
  /** Reveal by dropping in from above (lists opened by a control). */
  dropDown?: boolean;
}) {
  const status = isCompleted ? "Completed" : isNext ? "This weekend" : null;
  const reveal = dropDown ? "down" : "";
  const when = formatRaceDateTime(race.date, race.time, { weekday: "short", month: "short", day: "numeric" });

  if (isCompleted) {
    return (
      <Link to="/results/$year/$round" params={{ year: race.season, round: race.round }} className="row link-row" data-reveal={reveal}>
        <p className="row__label" aria-label={`Round ${race.round}`}>{race.round}</p>
        <div className="row__body">
          <p>
            {race.raceName}
            <span className="row__arrow" aria-hidden="true">
              <ChevronRight size={16} strokeWidth={2} />
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
      <p className="row__label" aria-label={`Round ${race.round}`} data-reveal={reveal}>{race.round}</p>
      <div className="row__body">
        <p data-reveal={reveal}>
          {race.raceName}
          {status && <span className="mute"> · {status}</span>}
        </p>
        <p className="mute" data-reveal={reveal}>
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
          <ControlButton onClick={() => window.location.reload()}>Try Again</ControlButton>
        </p>
      )}
    </div>
  );
}
