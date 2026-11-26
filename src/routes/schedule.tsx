import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  getRaceSchedule,
  getNextRace,
  getSeasons,
  formatRaceDateTime,
  isRaceCompleted,
  type Race
} from "@/lib/jolpica-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Flag, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Race Schedule — F1Box" },
      { name: "description", content: "Formula 1 race calendar with dates and circuits." },
      { property: "og:title", content: "Race Schedule — F1Box" },
      { property: "og:description", content: "Formula 1 race calendar with dates and circuits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://www.f1box.org/schedule" },
      { property: "og:url", content: "https://www.f1box.org/schedule" },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { data: seasons } = useQuery({ queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000 });
  const currentSeason = seasons?.[0];
  return currentSeason ? <div><ScheduleSection currentSeason={currentSeason} /></div> : null;
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
    <div className="min-h-screen bg-ground">
      <section id="schedule" className="editorial-page">
        <header className="">
          <div className="page-container editorial-stack">
            <div className="editorial-row" style={{ marginBottom: 'var(--s3)' }}>
              <div className="editorial-row__body">
                <h1 className="text-ink rise" style={{ "--i": "0" }} data-reveal>
                  Race Schedule
                </h1>
                <p className="lead-text rise" style={{ "--i": "1", marginTop: 'var(--s1)' }} data-reveal>
                  Formula 1 {season} calendar
                </p>
              </div>
            </div>

            {!seasonsLoading && seasons && (
              <div className="editorial-row__label" style={{ paddingTop: 'var(--s1)', textAlign: 'right' }} data-reveal>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger className="input-field" style={{ height: 'var(--ctl)' }}>
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent className="bg-ground border-hair rounded-xl">
                    {seasons.map((s) => (
                      <SelectItem key={s} value={s} className="px-4 py-2 text-sm hover:bg-wash focus:bg-wash">
                        {s} Season
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </header>

        <div className="page-container editorial-stack">
          {(scheduleLoading && !schedule) ? (
            <ScheduleSkeleton />
          ) : scheduleError ? (
            <ErrorState message="Failed to load schedule. Please try again." />
          ) : schedule && schedule.length > 0 ? (
            <RaceCalendar races={schedule} nextRace={nextRace ?? null} />
          ) : (
            <EmptyState message="No races scheduled for this season." />
          )}
        </div>
      </section>
    </div>
  );
}

function RaceCalendar({ races, nextRace }: { races: Race[]; nextRace: Race | null }) {
  const nextRaceRound = nextRace?.round;
  const [showPast, setShowPast] = useState(false);

  // Sort races by date (closest to farthest)
  const sortByDate = (a: Race, b: Race) => {
    const da = new Date(`${a.date}T${a.time || '00:00:00'}`);
    const db = new Date(`${b.date}T${b.time || '00:00:00'}`);
    return da.getTime() - db.getTime();
  };

  const upcomingRaces = useMemo(() => {
    return [...races]
      .filter(race => !isRaceCompleted(race.date, race.time))
      .sort(sortByDate);
  }, [races]);

  const pastRaces = useMemo(() => {
    return [...races]
      .filter(race => isRaceCompleted(race.date, race.time))
      .sort((a, b) => {
        const da = new Date(`${a.date}T${a.time || '00:00:00'}`);
        const db = new Date(`${b.date}T${b.time || '00:00:00'}`);
        return db.getTime() - da.getTime();
      });
  }, [races]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      {/* Upcoming / Current Races (shown by default) */}
      {upcomingRaces.map((race, index) => {
        const isNext = race.round === nextRaceRound;
        const isCompleted = isRaceCompleted(race.date, race.time);
        const isCurrent = !isCompleted && isNext;

        return (
          <RaceCard
            key={race.round}
            race={race}
            index={index}
            isNext={isNext}
            isCompleted={isCompleted}
            isCurrent={isCurrent}
          />
        );
      })}

      {/* Past Races - Collapsible */}
      {pastRaces.length > 0 && (
        <>
          <Button
            onClick={() => setShowPast(!showPast)}
            className="btn btn--secondary gap-2"
            aria-expanded={showPast}
            aria-controls="past-races"
            data-reveal
          >
            {showPast ? (
              <>
                <ChevronUp className="w-5 h-5" aria-hidden="true" />
                <span>Hide Past Races ({pastRaces.length})</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-5 h-5" aria-hidden="true" />
                <span>Show Past Races ({pastRaces.length})</span>
              </>
            )}
          </Button>

          <div
            id="past-races"
            className={`${showPast ? "expanded" : "collapsed"}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--s3)',
            }}
          >
            {pastRaces.map((race, index) => {
              const isNext = race.round === nextRaceRound;
              const isCompleted = isRaceCompleted(race.date, race.time);
              const isCurrent = !isCompleted && isNext;

              return (
                <RaceCard
                  key={race.round}
                  race={race}
                  index={index}
                  isNext={isNext}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function RaceCard({ race, index, isNext, isCompleted, isCurrent }: {
  race: Race;
  index: number;
  isNext: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
}) {
  return (
    <div
      className="race-entry"
      style={{ "--i": String(index % 10) }}
      data-reveal
    >
      <div style={{ padding: 'var(--s2) var(--s3) var(--s2) var(--s4)' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          {/* Round & Status */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="race-round"
              aria-label={`Round ${race.round}`}
            >
              {race.round}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-ink text-lg md:text-xl" data-reveal>{race.raceName}</h3>
                {isCurrent && (
                  <span className="tag bg-ink text-player-text text-xs" data-reveal>THIS WEEKEND</span>
                )}
                {isNext && !isCurrent && (
                  <span className="tag bg-pill border-hair text-ink text-xs" data-reveal>NEXT</span>
                )}
                {isCompleted && (
                  <span className="tag text-ink-2 text-xs" data-reveal>COMPLETED</span>
                )}
              </div>
              <p className="text-ink-2 text-sm md:text-base" data-reveal>
                {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
              </p>
            </div>
          </div>

          {/* Race Date */}
          <div className="text-right md:text-left flex-shrink-0">
            <p className="race-date" data-reveal>
              {formatRaceDateTime(race.date, race.time, { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-xl border border-hair bg-ground" style={{ padding: 'var(--s4)' }}>
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-wash" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-48 bg-wash rounded" />
              <div className="h-4 w-64 bg-wash rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="page-container text-center" style={{ paddingTop: 'var(--s15)', paddingBottom: 'var(--s15)' }}>
      <h3 className="text-lg font-medium text-ink" style={{ marginBottom: 'var(--s2)' }}>Unable to load schedule</h3>
      <p className="text-ink-2" style={{ marginBottom: 'var(--s4)' }}>{message}</p>
      <Button onClick={() => window.location.reload()} className="btn btn--primary">Try Again</Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="page-container text-center" style={{ paddingTop: 'var(--s15)', paddingBottom: 'var(--s15)' }}>
      <h3 className="text-lg font-medium text-ink" style={{ marginBottom: 'var(--s2)' }}>No Races Scheduled</h3>
      <p className="text-ink-2">{message}</p>
    </div>
  );
}