import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getDriverStandings,
  getConstructorStandings,
  getSeasons,
  type DriverStanding,
  type ConstructorStanding,
  type Constructor
} from "@/lib/jolpica-api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/standings")({
  head: () => ({
    meta: [
      { title: "Driver & Constructor Standings — F1Box" },
      { name: "description", content: "Current Formula 1 driver and constructor championship standings." },
      { property: "og:title", content: "Driver & Constructor Standings — F1Box" },
      { property: "og:description", content: "Current Formula 1 driver and constructor championship standings." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.f1box.org/standings" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://www.f1box.org/standings" },
    ],
  }),
  component: StandingsPage,
});

function StandingsPage() {
  const { data: seasons } = useQuery({ queryKey: ["seasons"], queryFn: getSeasons, staleTime: 60 * 60 * 1000 });
  const currentSeason = seasons?.[0];
  return currentSeason ? <StandingsSection currentSeason={currentSeason} /> : <div className="page" />;
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

  const loading = (driversLoading || constructorsLoading) && !driverStandings && !constructorStandings;

  return (
    <div className="page">
      <section id="standings" className="rows">
        <div className="page-container head">
          <h1 data-reveal>Championship Standings</h1>
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

        {loading ? null : driversError || constructorsError ? (
          <Notice title="Unable to load standings" message="Failed to load standings. Please try again." retry />
        ) : (
          <div className="page-container">
            <Tabs defaultValue="drivers">
              <TabsList className="tabs-list" data-reveal>
                <TabsTrigger value="drivers">Drivers</TabsTrigger>
                <TabsTrigger value="constructors">Constructors</TabsTrigger>
              </TabsList>

              <TabsContent value="drivers">
                <DriverStandingsTable standings={driverStandings || []} />
              </TabsContent>
              <TabsContent value="constructors">
                <ConstructorStandingsTable standings={constructorStandings || []} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </section>
    </div>
  );
}

function DriverStandingsTable({ standings }: { standings: DriverStanding[] }) {
  if (!standings.length) return <Notice title="No Data Available" message="No driver standings available for this season." />;

  return (
    <table className="table">
      <thead>
        <tr data-reveal>
          <th className="col-pos">Pos</th>
          <th>Driver</th>
          <th>Team</th>
          <th className="col-num num">Points</th>
          <th className="col-num num">Wins</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((standing) => (
          <tr key={standing.Driver.driverId} data-reveal>
            <td>{standing.position}</td>
            <td>
              <div className="driver">
                <span className="driver__code" aria-hidden="true">{standing.Driver.code}</span>
                <div className="driver__name">
                  <p>{standing.Driver.givenName} {standing.Driver.familyName}</p>
                  <p className="mute">{standing.Driver.nationality}</p>
                </div>
              </div>
            </td>
            <td>{standing.Constructors[0]?.name}</td>
            <td className="num">{standing.points}</td>
            <td className="num">{standing.wins}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConstructorStandingsTable({ standings }: { standings: ConstructorStanding[] }) {
  if (!standings.length) return <Notice title="No Data Available" message="No constructor standings available for this season." />;

  return (
    <table className="table">
      <thead>
        <tr data-reveal>
          <th className="col-pos">Pos</th>
          <th>Constructor</th>
          <th className="col-num num">Points</th>
          <th className="col-num num">Wins</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((standing) => (
          <tr key={standing.Constructor.constructorId} data-reveal>
            <td>{standing.position}</td>
            <td>{standing.Constructor.name}</td>
            <td className="num">{standing.points}</td>
            <td className="num">{standing.wins}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
