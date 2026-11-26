import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  getRaceSchedule,
  getNextRace,
  getSeasons,
  formatRaceDateTime,
  getTimeUntilRace,
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

  const [countdown, setCountdown] = useState<ReturnType<typeof getTimeUntilRace> | null>(null);

  useEffect(() => {
    if (!nextRace) return;
    const update = () => setCountdown(getTimeUntilRace(nextRace.date, nextRace.time));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [nextRace]);

  return (
    <div className="min-h-screen bg-ground">

      <section id="schedule" className="editorial-page">
        <header className="">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-ink  rise" style={{ "--i": "0" }}>
                Race Schedule
              </h1>
              <p className="lead-text mt-2 rise" style={{ "--i": "1" }}>
                Formula 1 {season} calendar
              </p>
            </div>

            {!seasonsLoading && seasons && (
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger className="input-field h-11">
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
            )}
          </div>

          {/* Next Race Highlight */}
          {nextRace && countdown && !countdown.isPast && (
            <NextRaceCard race={nextRace} countdown={countdown} />
          )}

        </header>

        {(scheduleLoading && !schedule) ? (
          <ScheduleSkeleton />
        ) : scheduleError ? (
          <ErrorState message="Failed to load schedule. Please try again." />
        ) : schedule && schedule.length > 0 ? (
          <RaceCalendar races={schedule} nextRace={nextRace ?? null} />
        ) : (
          <EmptyState message="No races scheduled for this season." />
        )}
      </section>
    </div>
  );
}

function NextRaceCard({ race, countdown }: { race: Race; countdown: ReturnType<typeof getTimeUntilRace> }) {
  const daysLeft = countdown.days;
  const isThisWeek = daysLeft <= 7;

  return (
    <div className="next-race" style={{ "--i": "3" }}>
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="tag bg-soft border-hair text-player-text text-xs">NEXT RACE</span>
            {isThisWeek && (
              <span className="tag text-ink-2 text-xs">THIS WEEK</span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-2">{race.raceName}</h2>
          <p className="text-ink-2 text-sm md:text-base mb-4">
            {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
          </p>
          <p className="text-ink-2 text-sm md:text-base flex items-center gap-1">
            {formatRaceDateTime(race.date, race.time, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-4 md:gap-6">
          <div className="text-center">
            <p className="text-ink-2 text-xs uppercase  mb-1">COUNTDOWN</p>
            <div className="flex items-center justify-center gap-2 md:gap-3 font-sans">
              <CountdownUnit value={countdown.days} label="D" />
              <CountdownUnit value={countdown.hours} label="H" />
              <CountdownUnit value={countdown.minutes} label="M" />
              <CountdownUnit value={countdown.seconds} label="S" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[2.5rem] md:min-w-[3rem]">
      <span className="text-2xl md:text-3xl lg:text-4xl font-bold tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs text-ink-2 uppercase ">{label}</span>
    </div>
  );
}

function RaceCalendar({ races, nextRace }: { races: Race[]; nextRace: Race | null }) {
  const nextRaceRound = nextRace?.round;
  const [showPast, setShowPast] = useState(false);

  // Sort races from newest to oldest (highest round first)
  const sortedRaces = useMemo(() => {
    return [...races].sort((a, b) => parseInt(b.round, 10) - parseInt(a.round, 10));
  }, [races]);

  // Split into upcoming/current and past
  const upcomingRaces = useMemo(() => {
    return sortedRaces.filter(race => !isRaceCompleted(race.date, race.time));
  }, [sortedRaces]);

  const pastRaces = useMemo(() => {
    return sortedRaces.filter(race => isRaceCompleted(race.date, race.time));
  }, [sortedRaces]);

  return (
    <div className="space-y-3 md:space-y-4 rise" style={{ "--i": "4" }}>
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
            className="btn btn-text gap-2"
            aria-expanded={showPast}
            aria-controls="past-races"
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

          <div id="past-races" className={`space-y-3 md:space-y-4 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${showPast ? "opacity-100 max-h-[5000px]" : "opacity-0 max-h-0 pointer-events-none"}`}>
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
    >
      <div className="p-4 md:p-6 lg:p-7">
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
                <h3 className="font-semibold text-ink text-lg md:text-xl">{race.raceName}</h3>
                {isCurrent && (
                  <span className="tag bg-ink text-player-text text-xs animate-pulse">LIVE WEEKEND</span>
                )}
                {isNext && !isCurrent && (
                  <span className="tag bg-pill border-hair text-ink text-xs">NEXT</span>
                )}
                {isCompleted && (
                  <span className="tag text-ink-2 text-xs">COMPLETED</span>
                )}
              </div>
              <p className="text-ink-2 text-sm md:text-base">
                {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
              </p>
            </div>
          </div>

          {/* Race Date */}
          <div className="text-right md:text-left flex-shrink-0">
            <p className="race-date">
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
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-xl border border-hair bg-ground p-6 animate-pulse">
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
    <div className="text-center py-16 md:py-24">
      <h3 className="text-lg font-medium text-ink mb-2">Unable to load schedule</h3>
      <p className="text-ink-2 mb-4">{message}</p>
      <Button onClick={() => window.location.reload()} className="btn btn-ink">Try Again</Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 md:py-24">
      <h3 className="text-lg font-medium text-ink mb-2">No Races Scheduled</h3>
      <p className="text-ink-2">{message}</p>
    </div>
  );
}