import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  seasonsRes,
  driverStandingsRes,
  constructorStandingsRes,
  type DriverStanding,
  type ConstructorStanding,
  type Driver,
} from "@/lib/jolpica-api";
import { useResource } from "@/lib/data/use-resource";
import { ENDPOINTS, KEYS, TTL, currentYear, standingsTtl } from "@/lib/data/config";
import { earlyFetchScript } from "@/lib/data/early";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SystemSelect } from "@/components/ui/system-select";
import { LoadingSpinner } from "@/components/ui/loader-circle-icon";
import { fadeOutList } from "@/lib/reveal";

export const Route = createFileRoute("/standings")({
  head: () => ({
    meta: [
      { title: "Standings" },
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
    scripts: [
      // Both tabs' data started early so constructor standings are ready on click.
      {
        children: earlyFetchScript([
          { url: ENDPOINTS.seasons, key: KEYS.seasons, ttl: TTL.completedSeason },
          { url: ENDPOINTS.driverStandings(currentYear()), key: KEYS.driverStandings(currentYear()), ttl: standingsTtl(currentYear()) },
          { url: ENDPOINTS.constructorStandings(currentYear()), key: KEYS.constructorStandings(currentYear()), ttl: standingsTtl(currentYear()) },
        ]),
      },
    ],
  }),
  component: StandingsPage,
});

function StandingsPage() {
  const seasons = useResource(seasonsRes);
  const currentSeason = seasons.data?.[0];
  return currentSeason ? <StandingsSection currentSeason={currentSeason} /> : <div className="page" />;
}

export function StandingsSection({ currentSeason }: { currentSeason: string }) {
  const [season, setSeason] = useState<string>(currentSeason);
  const [tab, setTab] = useState("drivers");

  const seasons = useResource(seasonsRes);
  const drivers = useResource(driverStandingsRes(season));
  const constructors = useResource(constructorStandingsRes(season));

  const anyError = drivers.error || constructors.error;
  const hasData = !!(drivers.data || constructors.data);

  // The tab strip is static chrome. Once it has appeared it must never unmount,
  // so switching season — which clears that season's data — cannot replay its
  // reveal animation. Only the tables inside the tabs change.
  const [tabsReady, setTabsReady] = useState(false);
  useEffect(() => {
    if (hasData) setTabsReady(true);
  }, [hasData]);

  // Lists fade out before they are replaced (season or tab), like a page change.
  const listRef = useRef<HTMLDivElement>(null);
  const swapList = (apply: () => void) => {
    void fadeOutList(listRef.current, ".table [data-reveal]").then(apply);
  };

  const handleSeason = (next: string) => {
    swapList(() => setSeason(next));
  };

  const handleTab = (next: string) => {
    if (next === tab) return;
    swapList(() => setTab(next));
  };

  return (
    <div className="page">
      <section id="standings" className="rows">
        <div className="page-container head">
          <h1 data-reveal>Championship Standings</h1>
          {seasons.data && (
            <SystemSelect
              value={season}
              options={seasons.data.map((s) => ({ value: s, label: `${s} Season` }))}
              onChange={handleSeason}
              ariaLabel="Season"
            />
          )}
        </div>

        {!tabsReady && !hasData ? (
          anyError ? (
            <Notice title="Unable to load standings" message="Failed to load standings. Please try again." retry />
          ) : null
        ) : (
          <div className="page-container" ref={listRef}>
            <Tabs value={tab} onValueChange={handleTab}>
              <TabsList className="tabs-list" data-reveal>
                <TabsTrigger value="drivers">Drivers</TabsTrigger>
                <TabsTrigger value="constructors">Constructors</TabsTrigger>
              </TabsList>

              <TabsContent value="drivers">
                {drivers.error && !drivers.data ? (
                  <Notice title="Unable to load standings" message="Failed to load standings. Please try again." inTable />
                ) : (
                  <DriverStandingsTable key={`drivers-${season}`} standings={drivers.data || []} loading={!drivers.data} />
                )}
              </TabsContent>
              <TabsContent value="constructors">
                {constructors.error && !constructors.data ? (
                  <Notice title="Unable to load standings" message="Failed to load standings. Please try again." inTable />
                ) : (
                  <ConstructorStandingsTable key={`constructors-${season}`} standings={constructors.data || []} loading={!constructors.data} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </section>
    </div>
  );
}

function DriverStandingsTable({ standings, loading }: { standings: DriverStanding[]; loading?: boolean }) {
  if (!standings.length && !loading) return <Notice title="No Data Available" message="No driver standings available for this season." inTable />;
  if (loading && !standings.length) {
    return (
      <table className="table">
        <thead>
          <tr>
            <th className="col-pos">
              <LoadingSpinner size={15} />
            </th>
          </tr>
        </thead>
      </table>
    );
  }

  // Helper to get display position (handles "-" for unclassified)
  const getDisplayPosition = (standing: DriverStanding, index: number): string => {
    if (standing.positionText && standing.positionText !== "-") return standing.positionText;
    if (standing.position && standing.position !== "-") return standing.position;
    // Fallback to array index + 1 for unclassified
    return `${index + 1}`;
  };

  // Helper to get driver number only (no code)
  const getDriverNumber = (driver: Driver): string => {
    const number = driver.permanentNumber?.trim();
    return number ? `#${number}` : "";
  };

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
        {standings.map((standing, index) => (
          <tr key={standing.Driver.driverId || standing.Driver.familyName} data-reveal>
            <td>{getDisplayPosition(standing, index)}</td>
            <td>
              <div className="driver">
                <div className="driver__name">
                  <p>{standing.Driver.givenName} {standing.Driver.familyName}</p>
                  <p className="mute">{getDriverNumber(standing.Driver)}</p>
                </div>
              </div>
            </td>
            <td>{standing.Constructors[0]?.name || "Unknown"}</td>
            <td className="num">{standing.points}</td>
            <td className="num">{standing.wins}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConstructorStandingsTable({ standings, loading }: { standings: ConstructorStanding[]; loading?: boolean }) {
  if (!standings.length && !loading) return <Notice title="No Data Available" message="No constructor standings available for this season." inTable />;
  if (loading && !standings.length) {
    return (
      <table className="table">
        <thead>
          <tr>
            <th className="col-pos">
              <LoadingSpinner size={15} />
            </th>
          </tr>
        </thead>
      </table>
    );
  }

  return (
    <table className="table">
      <thead>
        <tr data-reveal>
          <th className="col-pos">Pos</th>
          <th>Constructor</th>
          <th></th>
          <th className="col-num num">Points</th>
          <th className="col-num num">Wins</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((standing) => (
          <tr key={standing.Constructor.constructorId} data-reveal>
            <td>{standing.position}</td>
            <td>
              <div className="driver">
                <div className="driver__name">
                  <p>{standing.Constructor.name}</p>
                  <p className="mute">{standing.Constructor.nationality}</p>
                </div>
              </div>
            </td>
            <td></td>
            <td className="num">{standing.points}</td>
            <td className="num">{standing.wins}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Notice({ title, message, retry, inTable = false }: { title: string; message: string; retry?: boolean; inTable?: boolean }) {
  if (inTable) {
    return (
      <tr data-reveal>
        <td colSpan={5} className="stack-tight">
          <p>{title}</p>
          <p className="mute">{message}</p>
          {retry && (
            <p>
              <button type="button" className="control" onClick={() => window.location.reload()}>Try Again</button>
            </p>
          )}
        </td>
      </tr>
    );
  }
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
