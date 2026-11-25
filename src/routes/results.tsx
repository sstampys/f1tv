import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";
import {
  getRaceSchedule,
  getSeasons,
  formatRaceDateTime,
  isRaceCompleted,
  type Race
} from "@/lib/jolpica-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, Calendar, CheckCircle, Loader2, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Race Results — F1Box" },
      { name: "description", content: "Browse Formula 1 race results by season and round." },
    ],
  }),
  beforeLoad: ({ location }) => {
    if (location.pathname.replace(/\/$/, "") === "/results") throw redirect({ to: "/", hash: "results" });
  },
});

export function ResultsSection({ currentSeason }: { currentSeason: string }) {
  const [season, setSeason] = useState<string>(currentSeason);

  const { data: seasons, isLoading: seasonsLoading } = useQuery({
    queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000,
  });

  const { data: schedule, isLoading: scheduleLoading, error: scheduleError } = useQuery({
    queryKey: ["schedule", season], queryFn: () => getRaceSchedule(season), enabled: !!season, staleTime: 60 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-ground">

      <section id="results" className="scroll-mt-16 max-w-[1280px] mx-auto px-[24px] pb-24 md:pb-32">
        <header className="py-10 md:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-ink tracking-tight rise" style={{ "--i": "0" }}>
                Race Results
              </h1>
              <p className="lead-text mt-2 rise" style={{ "--i": "1" }}>
                Browse Formula 1 {season} race results
              </p>
            </div>

            {!seasonsLoading && seasons && (
              <Select value={season} onValueChange={setSeason} className="w-full sm:w-48 rise" style={{ "--i": "2" }}>
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

          <p className="text-sm text-ink-3 rise mt-8" style={{ "--i": "3" }}>
            Data sourced from <a href="https://api.jolpi.ca/ergast/f1/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink transition-colors">Jolpica-F1 API</a> (Ergast successor)
          </p>
        </header>

        <Outlet />
      </section>
    </div>
  );
}

function RaceResultsList({ races }: { races: Race[] }) {
  return (
    <div className="space-y-3 md:space-y-4 rise" style={{ "--i": "4" }}>
      {races.map((race, index) => {
        const completed = isRaceCompleted(race.date, race.time);

        return (
          <Link
            key={race.round}
            to={`/results/${race.round}`}
            className="group block rounded-xl border border-hair bg-ground p-4 md:p-6 lg:p-7 transition-all duration-200 hover:border-ink/50 hover:bg-wash/50 hover:shadow-[var(--shadow-card)]"
            style={{ "--i": String(index % 10) }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center font-bold text-lg md:text-xl flex-shrink-0"
                  style={{
                    background: completed ? "var(--color-ink)" : "var(--color-pill)",
                    color: completed ? "#fff" : "var(--color-ink)"
                  }}
                  aria-label={`Round ${race.round}`}
                >
                  {race.round}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-ink text-lg md:text-xl">{race.raceName}</h3>
                    {completed && (
                      <CheckCircle className="w-4 h-4 text-green-500" aria-label="Completed" />
                    )}
                    {!completed && (
                      <span className="tag bg-pill border-hair text-ink text-xs">UPCOMING</span>
                    )}
                  </div>
                  <p className="text-ink-2 text-sm md:text-base">
                    {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 md:gap-6">
                <div className="text-right md:text-left flex-shrink-0">
                  <p className="font-mono text-lg md:text-xl font-semibold text-ink">
                    {formatRaceDateTime(race.date, race.time, { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>

                <span className="text-ink-3 text-sm md:text-base flex items-center gap-1 group-hover:text-ink transition-colors">
                  {completed ? "View Results" : "View Details"}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ResultsIndexSkeleton() {
  return (
    <div className="space-y-3 md:space-y-4">
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
      <h3 className="text-lg font-medium text-ink mb-2">Unable to load races</h3>
      <p className="text-ink-2 mb-4">{message}</p>
      <button onClick={() => window.location.reload()} className="btn btn-ink">Try Again</button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 md:py-24">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-wash flex items-center justify-center">
        <Flag className="w-8 h-8 text-ink-3" />
      </div>
      <h3 className="text-lg font-medium text-ink mb-2">No Races Found</h3>
      <p className="text-ink-2">{message}</p>
    </div>
  );
}