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
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { data: seasons } = useQuery({ queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000 });
  const currentSeason = seasons?.[0];
  return currentSeason ? <div className="pt-16"><ScheduleSection currentSeason={currentSeason} /></div> : null;
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

      <section id="schedule" className="scroll-mt-16 max-w-[1280px] mx-auto px-[24px] pb-24 md:pb-32">
        <header className="py-10 md:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-ink tracking-tight rise" style={{ "--i": "0" }}>
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
                <SelectContent className="bg-ground border-hair rounded-xl shadow-[var(--shadow-card)]">
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

          <p className="text-sm text-ink-3 rise mt-8" style={{ "--i": "3" }}>
            Data sourced from <a href="https://api.jolpi.ca/ergast/f1/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink transition-colors">Jolpica-F1 API</a> (Ergast successor)
          </p>
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
    <div className="rise relative overflow-hidden rounded-2xl bg-gradient-to-r from-ink via-ink-2 to-ink-3 p-6 md:p-8 lg:p-10 text-white mt-10" style={{ "--i": "3" }}>
      <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="tag bg-white/20 border-white/30 text-white text-xs">NEXT RACE</span>
            {isThisWeek && (
              <span className="tag bg-red-500 border-red-500 text-white text-xs animate-pulse">THIS WEEK</span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-2">{race.raceName}</h2>
          <p className="text-white/80 text-sm md:text-base mb-4">
            <MapPin className="w-4 h-4 inline mr-1" aria-hidden="true" />
            {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
          </p>
          <p className="text-white/60 text-sm md:text-base flex items-center gap-1">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            {formatRaceDateTime(race.date, race.time, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-4 md:gap-6">
          <div className="text-center">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">COUNTDOWN</p>
            <div className="flex items-center justify-center gap-2 md:gap-3 font-mono">
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
      <span className="text-xs text-white/60 uppercase tracking-wider">{label}</span>
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
          <button
            onClick={() => setShowPast(!showPast)}
            className="w-full btn btn-wash justify-center gap-2 py-3"
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
          </button>

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
      className={`group block rounded-xl border transition-all duration-200 ${
        isCurrent
          ? "border-ink bg-wash shadow-[var(--shadow-card)] ring-2 ring-ink/10"
          : "border-hair bg-ground hover:border-ink/50 hover:bg-wash/50 hover:shadow-[var(--shadow-card)]"
      }`}
      style={{ "--i": String(index % 10) }}
    >
      <div className="p-4 md:p-6 lg:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          {/* Round & Status */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center font-bold text-lg md:text-xl flex-shrink-0"
              style={{
                background: isCurrent ? "var(--color-ink)" : isCompleted ? "var(--color-wash)" : "var(--color-pill)",
                color: isCurrent ? "#fff" : "var(--color-ink)"
              }}
              aria-label={`Round ${race.round}`}
            >
              {race.round}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-ink text-lg md:text-xl">{race.raceName}</h3>
                {isCurrent && (
                  <span className="tag bg-ink text-white text-xs animate-pulse">LIVE WEEKEND</span>
                )}
                {isNext && !isCurrent && (
                  <span className="tag bg-pill border-hair text-ink text-xs">NEXT</span>
                )}
                {isCompleted && (
                  <span className="tag bg-green-100 border-green-200 text-green-700 text-xs">COMPLETED</span>
                )}
              </div>
              <p className="text-ink-2 text-sm md:text-base">
                {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
              </p>
            </div>
          </div>

          {/* Race Date */}
          <div className="text-right md:text-left flex-shrink-0">
            <p className="font-mono text-lg md:text-xl font-semibold text-ink">
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
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-ink mb-2">Unable to load schedule</h3>
      <p className="text-ink-2 mb-4">{message}</p>
      <button onClick={() => window.location.reload()} className="btn btn-ink">Try Again</button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 md:py-24">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-wash flex items-center justify-center">
        <Calendar className="w-8 h-8 text-ink-3" />
      </div>
      <h3 className="text-lg font-medium text-ink mb-2">No Races Scheduled</h3>
      <p className="text-ink-2">{message}</p>
    </div>
  );
}