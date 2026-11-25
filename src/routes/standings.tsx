import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  getDriverStandings,
  getConstructorStandings,
  getSeasons,
  type DriverStanding,
  type ConstructorStanding
,
  type Constructor
} from "@/lib/jolpica-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trophy, Flag } from "lucide-react";

export const Route = createFileRoute("/standings")({
  head: () => ({
    meta: [
      { title: "Driver & Constructor Standings — F1Box" },
      { name: "description", content: "Current Formula 1 driver and constructor championship standings." },
    ],
  }),
  component: StandingsPage,
});

function StandingsPage() {
  const { data: seasons } = useQuery({ queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000 });
  const currentSeason = seasons?.[0];
  return currentSeason ? <div className="pt-16"><StandingsSection currentSeason={currentSeason} /></div> : null;
}

export function StandingsSection({ currentSeason }: { currentSeason: string }) {
  const [season, setSeason] = useState<string>(currentSeason);

  const { data: seasons, isLoading: seasonsLoading } = useQuery({
    queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000,
  });

  const { data: driverStandings, isLoading: driversLoading, error: driversError } = useQuery({
    queryKey: ["driverStandings", season], queryFn: () => getDriverStandings(season), enabled: !!season, staleTime: 30 * 60 * 1000,
  });

  const { data: constructorStandings, isLoading: constructorsLoading, error: constructorsError } = useQuery({
    queryKey: ["constructorStandings", season], queryFn: () => getConstructorStandings(season), enabled: !!season, staleTime: 30 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-ground">

      <section id="standings" className="scroll-mt-16 max-w-[1280px] mx-auto px-[24px] pb-24 md:pb-32">
        <header className="py-10 md:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-ink tracking-tight rise" style={{ "--i": "0" }}>
                Championship Standings
              </h1>
              <p className="lead-text mt-2 rise" style={{ "--i": "1" }}>
                Formula 1 {season} driver and constructor championship points
              </p>
            </div>

            {/* Season Selector */}
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

          <p className="text-sm text-ink-3 rise mt-8" style={{ "--i": "3" }}>
            Data sourced from <a href="https://api.jolpi.ca/ergast/f1/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink transition-colors">Jolpica-F1 API</a> (Ergast successor)
          </p>
        </header>

        {(driversLoading || constructorsLoading) && !driverStandings && !constructorStandings ? (
          <StandingsSkeleton />
        ) : driversError || constructorsError ? (
          <ErrorState message="Failed to load standings. Please try again." />
        ) : (
          <Tabs defaultValue="drivers" className="w-full">
            <TabsList className="bg-wash rounded-xl p-1 mb-8 rise" style={{ "--i": "0" }}>
              <TabsTrigger value="drivers" className="px-6 py-2.5 text-sm font-medium">
                <Trophy className="w-4 h-4 mr-2 inline" aria-hidden="true" />
                Drivers
              </TabsTrigger>
              <TabsTrigger value="constructors" className="px-6 py-2.5 text-sm font-medium">
                <Flag className="w-4 h-4 mr-2 inline" aria-hidden="true" />
                Constructors
              </TabsTrigger>
            </TabsList>

            <TabsContent value="drivers" className="rise" style={{ "--i": "1" }}>
              <DriverStandingsTable standings={driverStandings || []} />
            </TabsContent>
            <TabsContent value="constructors" className="rise" style={{ "--i": "2" }}>
              <ConstructorStandingsTable standings={constructorStandings || []} />
            </TabsContent>
          </Tabs>
        )}
      </section>
    </div>
  );
}

function DriverStandingsTable({ standings }: { standings: DriverStanding[] }) {
  if (!standings.length) return <EmptyState message="No driver standings available for this season." />;

  return (
    <div className="overflow-x-auto rounded-xl border border-hair bg-ground">
      <table className="w-full" role="table">
        <thead className="bg-wash border-b border-hair">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Pos</th>
            <th className="px-4 py-4 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Driver</th>
            <th className="px-4 py-4 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Team</th>
            <th className="px-4 py-4 text-right text-xs font-semibold text-ink-3 uppercase tracking-wider">Points</th>
            <th className="px-4 py-4 text-right text-xs font-semibold text-ink-3 uppercase tracking-wider">Wins</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hair">
          {standings.map((standing, index) => (
            <tr key={standing.Driver.driverId} className="hover:bg-wash/50 transition-colors">
              <td className="px-4 py-4 text-sm font-medium text-ink">
                <span className={getPositionClass(standing.position)}>
                  {standing.position}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-ink-3 text-xs uppercase tracking-wider hidden sm:block">
                    {standing.Driver.code}
                  </span>
                  <div>
                    <p className="font-medium text-ink">
                      {standing.Driver.givenName} {standing.Driver.familyName}
                    </p>
                    <p className="text-xs text-ink-3">{standing.Driver.nationality}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <ConstructorBadge constructor={standing.Constructors[0]} />
                </div>
              </td>
              <td className="px-4 py-4 text-right font-mono text-lg font-semibold text-ink">
                {standing.points}
              </td>
              <td className="px-4 py-4 text-right font-mono text-sm text-ink-2">
                {standing.wins}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConstructorStandingsTable({ standings }: { standings: ConstructorStanding[] }) {
  if (!standings.length) return <EmptyState message="No constructor standings available for this season." />;

  return (
    <div className="overflow-x-auto rounded-xl border border-hair bg-ground">
      <table className="w-full" role="table">
        <thead className="bg-wash border-b border-hair">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Pos</th>
            <th className="px-4 py-4 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Constructor</th>
            <th className="px-4 py-4 text-right text-xs font-semibold text-ink-3 uppercase tracking-wider">Points</th>
            <th className="px-4 py-4 text-right text-xs font-semibold text-ink-3 uppercase tracking-wider">Wins</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hair">
          {standings.map((standing) => (
            <tr key={standing.Constructor.constructorId} className="hover:bg-wash/50 transition-colors">
              <td className="px-4 py-4 text-sm font-medium text-ink">
                <span className={getPositionClass(standing.position)}>
                  {standing.position}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <ConstructorBadge constructor={standing.Constructor} size="lg" />
                  <div>
                    <p className="font-medium text-ink">{standing.Constructor.name}</p>
                    <p className="text-xs text-ink-3">{standing.Constructor.nationality}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 text-right font-mono text-lg font-semibold text-ink">
                {standing.points}
              </td>
              <td className="px-4 py-4 text-right font-mono text-sm text-ink-2">
                {standing.wins}
              </td>
            </tr>
          ))}
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
  if (pos === 1) return "text-[gold] font-bold";
  if (pos === 2) return "text-[silver] font-bold";
  if (pos === 3) return "text-[#CD7F32] font-bold";
  return "";
}

function StandingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 bg-wash rounded-xl animate-pulse" />
      <div className="rounded-xl border border-hair bg-ground overflow-hidden">
        <div className="bg-wash border-b border-hair px-4 py-3" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="border-b border-hair last:border-0 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-wash rounded-lg animate-pulse" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-48 bg-wash rounded animate-pulse" />
                <div className="h-3 w-32 bg-wash rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
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
      <h3 className="text-lg font-medium text-ink mb-2">Unable to load standings</h3>
      <p className="text-ink-2 mb-4">{message}</p>
      <button onClick={() => window.location.reload()} className="btn btn-ink">
        Try Again
      </button>
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
      <h3 className="text-lg font-medium text-ink mb-2">No Data Available</h3>
      <p className="text-ink-2">{message}</p>
    </div>
  );
}