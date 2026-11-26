import { Button } from "@/components/ui/button";
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
      { property: "og:title", content: "Driver & Constructor Standings — F1Box" },
      { property: "og:description", content: "Current Formula 1 driver and constructor championship standings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StandingsPage,
});

function StandingsPage() {
  const { data: seasons } = useQuery({ queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000 });
  const currentSeason = seasons?.[0];
  return currentSeason ? <div><StandingsSection currentSeason={currentSeason} /></div> : null;
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

      <section id="standings" className="editorial-page">
        <header className="">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-ink  rise" style={{ "--i": "0" }}>
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
            <TabsList className="editorial-tabs mb-8" style={{ "--i": "0" }}>
              <TabsTrigger value="drivers" className="px-6 py-2.5 text-sm font-medium">
                Drivers
              </TabsTrigger>
              <TabsTrigger value="constructors" className="px-6 py-2.5 text-sm font-medium">
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
    <div className="editorial-table">
      <table className="w-full" role="table">
        <thead className="bg-wash border-b border-hair">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold text-ink-3 uppercase ">Pos</th>
            <th className="px-4 py-4 text-left text-xs font-semibold text-ink-3 uppercase ">Driver</th>
            <th className="px-4 py-4 text-left text-xs font-semibold text-ink-3 uppercase ">Team</th>
            <th className="px-4 py-4 text-right text-xs font-semibold text-ink-3 uppercase ">Points</th>
            <th className="px-4 py-4 text-right text-xs font-semibold text-ink-3 uppercase ">Wins</th>
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
                  <span className="text-ink-3 text-xs uppercase  hidden sm:block">
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
              <td className="px-4 py-4 text-right font-sans text-lg font-semibold text-ink">
                {standing.points}
              </td>
              <td className="px-4 py-4 text-right font-sans text-sm text-ink-2">
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
    <div className="editorial-table">
      <table className="w-full" role="table">
        <thead className="bg-wash border-b border-hair">
          <tr>
            <th className="px-4 py-4 text-left text-xs font-semibold text-ink-3 uppercase ">Pos</th>
            <th className="px-4 py-4 text-left text-xs font-semibold text-ink-3 uppercase ">Constructor</th>
            <th className="px-4 py-4 text-right text-xs font-semibold text-ink-3 uppercase ">Points</th>
            <th className="px-4 py-4 text-right text-xs font-semibold text-ink-3 uppercase ">Wins</th>
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
              <td className="px-4 py-4 text-right font-sans text-lg font-semibold text-ink">
                {standing.points}
              </td>
              <td className="px-4 py-4 text-right font-sans text-sm text-ink-2">
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
  return <span className="team-initial" aria-label={constructor?.name}>{constructor?.name.slice(0,1)}</span>;
}

function getPositionClass(position: string): string {
  return Number(position) <= 3 ? "font-medium" : "";
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
      <h3 className="text-lg font-medium text-ink mb-2">Unable to load standings</h3>
      <p className="text-ink-2 mb-4">{message}</p>
      <Button onClick={() => window.location.reload()} className="btn btn-ink">
        Try Again
      </Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 md:py-24">
      <h3 className="text-lg font-medium text-ink mb-2">No Data Available</h3>
      <p className="text-ink-2">{message}</p>
    </div>
  );
}