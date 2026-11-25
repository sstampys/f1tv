import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";
import {
  getRaceResults,
  getRaceSchedule,
  getSeasons,
  formatRaceDateTime,
  type Race,
  type RaceResult
} from "@/lib/jolpica-api";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, Clock, MapPin, Trophy, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/results/$round")({
  validateSearch: (search: Record<string, unknown>) => ({
    season: (search.season as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Race Results — F1Box" },
      { name: "description", content: "Formula 1 race results with positions, points, and fastest laps." },
    ],
  }),
  loader: async ({ params: { round }, search, context: { queryClient } }) => {
    const seasons = await getSeasons();
    const searchSeason = (search as { season?: string } | undefined)?.season;
    const currentSeason = searchSeason || seasons[0];

    await Promise.all([
      queryClient.prefetchQuery({ queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000 }),
      queryClient.prefetchQuery({ queryKey: ["schedule", currentSeason], queryFn: () => getRaceSchedule(currentSeason), staleTime: 60 * 60 * 1000 }),
      queryClient.prefetchQuery({ queryKey: ["results", currentSeason, round], queryFn: () => getRaceResults(currentSeason, round), staleTime: 30 * 60 * 1000 }),
    ]);

    return { currentSeason, round };
  },
  component: ResultsPage,
});

function ResultsPage() {
  const { round } = Route.useParams();
  const { currentSeason } = Route.useLoaderData();
  const { season: searchSeason } = Route.useSearch();
  const [season, setSeason] = useState<string>(searchSeason || currentSeason);
  const [race, setRace] = useState<Race | null>(null);
  const [adjacentRaces, setAdjacentRaces] = useState<{ prev: Race | null; next: Race | null }>({ prev: null, next: null });

  const { data: seasons, isLoading: seasonsLoading } = useQuery({
    queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000,
  });

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ["schedule", season], queryFn: () => getRaceSchedule(season), enabled: !!season, staleTime: 60 * 60 * 1000,
  });

  const { data: results, isLoading: resultsLoading, error: resultsError } = useQuery({
    queryKey: ["results", season, round], queryFn: () => getRaceResults(season, round), enabled: !!season && !!round, staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (searchSeason) {
      setSeason(searchSeason);
    } else if (seasons && !season) {
      setSeason(seasons[0]);
    }
  }, [searchSeason, seasons, season]);

  useEffect(() => {
    if (schedule && round) {
      const currentIndex = schedule.findIndex(r => r.round === round);
      if (currentIndex !== -1) {
        setRace(schedule[currentIndex]);
        setAdjacentRaces({
          prev: currentIndex > 0 ? schedule[currentIndex - 1] : null,
          next: currentIndex < schedule.length - 1 ? schedule[currentIndex + 1] : null,
        });
      }
    }
  }, [schedule, round]);

  const navigate = Route.useNavigate();
  const handleSeasonChange = (newSeason: string) => {
    setSeason(newSeason);
    navigate({ search: { season: newSeason } });
  };

  const isCompleted = race ? new Date(`${race.date}T${race.time}Z`) <= new Date() : false;

  return (
    <div className="min-h-screen bg-ground">
      <Navigation />

      <main className="pt-16 max-w-[1280px] mx-auto px-[24px] pb-24 md:pb-32">
        {/* Breadcrumb / Race Navigation */}
        <div className="mb-6 md:mb-8 rise" style={{ "--i": "0" }}>
          <nav className="flex items-center gap-2 text-sm text-ink-3" aria-label="Breadcrumb">
            <Link to="/results" className="hover:text-ink transition-colors">Results</Link>
            <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <Link to={`/results/${round}`} className="hover:text-ink transition-colors font-medium text-ink">
              Round {round}
            </Link>
          </nav>
        </div>

        {race && (
          <header className="py-6 md:py-10 mb-8 md:mb-10 rise" style={{ "--i": "1" }}>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="tag bg-ink text-white text-sm">RACE RESULT</span>
                  {isCompleted ? null : (
                    <span className="tag bg-amber-100 border-amber-200 text-amber-700 text-sm">UPCOMING</span>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-ink mb-3 tracking-tight">{race.raceName}</h1>
                <div className="flex flex-wrap items-center gap-4 text-ink-2 text-sm md:text-base">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    {formatRaceDateTime(race.date, race.time, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Season Selector */}
              {!seasonsLoading && seasons && (
                <Select value={season} onValueChange={handleSeasonChange} className="w-full sm:w-56">
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

            {/* Adjacent Race Navigation */}
            <div className="flex items-center justify-between">
              <Link
                to={adjacentRaces.prev ? `/results/${adjacentRaces.prev.round}` : "#"}
                className={`btn btn-wash gap-2 ${!adjacentRaces.prev ? "opacity-50 pointer-events-none" : ""}`}
                aria-disabled={!adjacentRaces.prev}
                aria-label={adjacentRaces.prev ? `Previous race: ${adjacentRaces.prev.raceName}` : "No previous race"}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Previous</span>
              </Link>

              <div className="text-center">
                <p className="text-ink-2 text-sm">Round {round} of {schedule?.length || "?"}</p>
                <p className="font-mono text-lg md:text-xl font-semibold text-ink">{race.raceName}</p>
              </div>

              <Link
                to={adjacentRaces.next ? `/results/${adjacentRaces.next.round}` : "#"}
                className={`btn btn-wash gap-2 ${!adjacentRaces.next ? "opacity-50 pointer-events-none" : ""}`}
                aria-disabled={!adjacentRaces.next}
                aria-label={adjacentRaces.next ? `Next race: ${adjacentRaces.next.raceName}` : "No next race"}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </header>
        )}

        {(resultsLoading && !results) ? (
          <ResultsSkeleton />
        ) : resultsError ? (
          <ErrorState message="Failed to load results. Please try again." />
        ) : race && results && results.length > 0 ? (
          <ResultsTable race={race} results={results} isCompleted={isCompleted} />
        ) : race && (!isCompleted) ? (
          <UpcomingRaceState race={race} />
        ) : (
          <EmptyState message="No results available for this race." />
        )}

        {/* Points System Reference */}
        {race && results && results.length > 0 && isCompleted && (
          <PointsSystem className="mt-10 md:mt-12 rise" style={{ "--i": "2" }} />
        )}
      </main>
    </div>
  );
}

function ResultsTable({ race, results, isCompleted }: { race: Race; results: RaceResult[]; isCompleted: boolean }) {
  const pointsSystem = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

  return (
    <div className="overflow-x-auto rounded-xl border border-hair bg-ground rise" style={{ "--i": "1" }}>
      <table className="w-full" role="table">
        <thead className="bg-wash border-b border-hair">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Pos</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Driver</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Team</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-ink-3 uppercase tracking-wider">Grid</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-ink-3 uppercase tracking-wider">Laps</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Time / Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-ink-3 uppercase tracking-wider">Pts</th>
            {isCompleted && (
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Fastest Lap</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-hair">
          {results.map((result) => {
            const position = parseInt(result.position, 10);
            const grid = parseInt(result.grid, 10);
            const positionChange = grid - position;
            const earnedPoints = position <= 10 ? pointsSystem[position - 1] : 0;
            const hasFastestLap = result.FastestLap && result.FastestLap.rank === "1";

            return (
              <tr key={result.Driver.driverId} className="hover:bg-wash/50 transition-colors">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className={getPositionClass(result.position)}>
                      {result.position}
                    </span>
                    {positionChange !== 0 && (
                      <span className={`text-xs font-medium ${positionChange > 0 ? "text-green-600" : "text-red-600"}`}>
                        {positionChange > 0 ? "+" : ""}{positionChange}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-ink-3 text-xs uppercase tracking-wider hidden sm:block">
                      {result.Driver.code}
                    </span>
                    <div>
                      <p className="font-medium text-ink">
                        {result.Driver.givenName} {result.Driver.familyName}
                      </p>
                      <p className="text-xs text-ink-3">{result.Driver.nationality}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ConstructorBadge constructor={result.Constructor} size="md" />
                </td>
                <td className="px-4 py-4 text-center font-mono text-sm text-ink-2">
                  {result.grid}
                </td>
                <td className="px-4 py-4 text-center font-mono text-sm text-ink-2">
                  {result.laps}
                </td>
                <td className="px-4 py-4">
                  {result.Time ? (
                    <span className="font-mono text-sm text-ink">
                      {result.position === "1" ? result.Time.time : `+${result.Time.time}`}
                    </span>
                  ) : (
                    <span className="text-ink-2 text-sm">{result.status}</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right font-mono text-lg font-semibold text-ink">
                  {earnedPoints}
                </td>
                {isCompleted && (
                  <td className="px-4 py-4">
                    {result.FastestLap ? (
                      <div className="flex items-center gap-2">
                        {hasFastestLap && <Trophy className="w-4 h-4 text-amber-500" aria-label="Fastest lap" />}
                        <span className="font-mono text-sm text-ink-2">
                          {result.FastestLap.Time.time}
                          {result.FastestLap.AverageSpeed && (
                            <span className="text-xs text-ink-3 ml-1">
                              ({result.FastestLap.AverageSpeed.speed} km/h)
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-ink-3 text-sm">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ConstructorBadge({ constructor, size = "md" }: { constructor: Constructor; size?: "sm" | "md" | "lg" }) {
  const colors: Record<string, string> = {
    red_bull: "#1E41FF", ferrari: "#DC143C", mercedes: "#00D2BE", mclaren: "#FF8700",
    aston_martin: "#006F62", alpine: "#0090FF", haas: "#B6BABD", rb: "#6692FF",
    williams: "#005AFF", sauber: "#52E252", racing_point: "#F596C8", renault: "#FFF500",
    toro_rosso: "#469BFF", force_india: "#F596C8", lotus: "#FFB800", caterham: "#005030",
    marussia: "#6E0000", hrt: "#B00000", virgin: "#DC143C", bmw_sauber: "#006EFF",
    toyota: "#FF6600", honda: "#FF1493", super_aguri: "#FF6600", spyker: "#FF6600",
    midland: "#FF6600", minardi: "#0066FF", jaguar: "#0066CC", prost: "#0033CC",
    arrows: "#FF9900", stewart: "#003399", tyrrell: "#0066FF", lola: "#FF3300",
    forticorse: "#FF3300", fondmetal: "#FF3300", brawn: "#FFFFFF", brabham: "#0066FF",
    audi: "#000000", cadillac: "#003399",
  };

  const bgColor = colors[constructor.constructorId] || "#666";
  const darkBgTeams = [
    "ferrari", "red_bull", "mercedes", "mclaren", "aston_martin", "alpine", "rb",
    "williams", "bmw_sauber", "minardi", "jaguar", "prost", "stewart", "tyrrell",
    "audi", "cadillac", "caterham", "marussia", "hrt", "toro_rosso"
  ];
  const textColor = darkBgTeams.includes(constructor.constructorId) ? "#fff" : "#171717";

  const sizes = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-semibold ${sizes[size]}`}
      style={{ background: bgColor, color: textColor }}
      aria-label={constructor.name}
    >
      {constructor.name.split(" ")[0].charAt(0)}
    </span>
  );
}

function getPositionClass(position: string): string {
  const pos = parseInt(position, 10);
  if (pos === 1) return "inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-lg bg-amber-500 text-white";
  if (pos === 2) return "inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-lg bg-gray-300 text-gray-700";
  if (pos === 3) return "inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-lg bg-amber-700 text-white";
  return "inline-flex items-center justify-center w-8 h-8 rounded-lg font-medium text-sm bg-wash text-ink";
}

function UpcomingRaceState({ race }: { race: Race }) {
  return (
    <div className="text-center py-16 md:py-24 rise" style={{ "--i": "1" }}>
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-wash flex items-center justify-center">
        <Flag className="w-10 h-10 text-ink-3" />
      </div>
      <h3 className="text-xl md:text-2xl font-medium text-ink mb-2">Race Not Started Yet</h3>
      <p className="text-ink-2 mb-6 max-w-md mx-auto">
        The {race.raceName} is scheduled for {formatRaceDateTime(race.date, race.time, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}.
        Results will appear here after the race concludes.
      </p>
      <div className="text-sm text-ink-3">
        <p>Check back after the race for full results including:</p>
        <ul className="mt-2 space-y-1 text-left max-w-xs mx-auto">
          <li>• Final classification with positions</li>
          <li>• Points earned by each driver</li>
          <li>• Fastest lap details</li>
          <li>• Grid vs finish comparison</li>
        </ul>
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="rounded-xl border border-hair bg-ground overflow-hidden rise" style={{ "--i": "1" }}>
      <div className="bg-wash border-b border-hair px-4 py-3" />
      {[...Array(8)].map((_, i) => (
        <div key={i} className="border-b border-hair last:border-0 px-4 py-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-wash" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-48 bg-wash rounded" />
              <div className="h-3 w-32 bg-wash rounded" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-wash" />
            <div className="w-12 h-5 bg-wash rounded" />
            <div className="w-12 h-5 bg-wash rounded" />
            <div className="w-24 h-5 bg-wash rounded" />
            <div className="w-16 h-6 bg-wash rounded" />
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
      <h3 className="text-lg font-medium text-ink mb-2">Unable to load results</h3>
      <p className="text-ink-2 mb-4">{message}</p>
      <button onClick={() => window.location.reload()} className="btn btn-ink">Try Again</button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 md:py-24">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-wash flex items-center justify-center">
        <svg className="w-8 h-8 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-ink mb-2">No Results Available</h3>
      <p className="text-ink-2">{message}</p>
    </div>
  );
}

function PointsSystem() {
  const points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

  return (
    <Card className="border-hair bg-ground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" aria-hidden="true" />
          Points System
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {points.map((pt, i) => (
            <div key={i} className="text-center p-3 rounded-lg bg-wash">
              <p className="text-2xl font-bold text-ink">{pt}</p>
              <p className="text-xs text-ink-3 uppercase tracking-wider">{i + 1}{getOrdinal(i + 1)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-3 mt-4 text-center">
          Fastest lap: +1 point (if driver finishes in top 10)
        </p>
      </CardContent>
    </Card>
  );
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

import { Calendar } from "lucide-react";