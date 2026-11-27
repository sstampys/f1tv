import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  seasonsRes,
  driverStandingsRes,
  constructorStandingsRes,
  type DriverStanding,
  type ConstructorStanding,
} from "@/lib/jolpica-api";
import { useResource } from "@/lib/data/use-resource";
import { ENDPOINTS, KEYS, TTL, currentYear, standingsTtl } from "@/lib/data/config";
import { earlyFetchScript } from "@/lib/data/early";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
      // Only the default tab's data is started early; the other tab loads on idle.
      {
        children: earlyFetchScript([
          { url: ENDPOINTS.seasons, key: KEYS.seasons, ttl: TTL.completedSeason },
          { url: ENDPOINTS.driverStandings(currentYear()), key: KEYS.driverStandings(currentYear()), ttl: standingsTtl(currentYear()) },
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
  const [otherEnabled, setOtherEnabled] = useState(false);

  // The inactive tab's data is requested on idle (or when that tab is opened),
  // so only the default tab's request sits on the critical path.
  useEffect(() => {
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setOtherEnabled(true));
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setOtherEnabled(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  const seasons = useResource(seasonsRes);
  const drivers = useResource(driverStandingsRes(season));
  const constructors = useResource(constructorStandingsRes(season), otherEnabled || tab === "constructors");

  const anyError = drivers.error || constructors.error;
  const hasData = !!(drivers.data || constructors.data);

  // The tab strip is static chrome. Once it has appeared it must never unmount,
  // so switching season — which clears that season's data — cannot replay its
  // reveal animation. Only the tables inside the tabs change.
  const [tabsReady, setTabsReady] = useState(false);
  useEffect(() => {
    if (hasData) setTabsReady(true);
  }, [hasData]);

  return (
    <div className="page">
      <section id="standings" className="rows">
        <div className="page-container head">
          <h1 data-reveal>Championship Standings</h1>
          {seasons.data && (
            <select
              className="control"
              aria-label="Season"
              value={season}
              onChange={(event) => setSeason(event.target.value)}
              data-reveal
            >
              {seasons.data.map((s) => (
                <option key={s} value={s}>{s} Season</option>
              ))}
            </select>
          )}
        </div>

        {!tabsReady && !hasData ? (
          anyError ? (
            <Notice title="Unable to load standings" message="Failed to load standings. Please try again." retry />
          ) : null
        ) : (
          <div className="page-container">
            <Tabs defaultValue="drivers" onValueChange={setTab}>
              <TabsList className="tabs-list" data-reveal>
                <TabsTrigger value="drivers">Drivers</TabsTrigger>
                <TabsTrigger
                  value="constructors"
                  onPointerEnter={() => setOtherEnabled(true)}
                  onFocus={() => setOtherEnabled(true)}
                >
                  Constructors
                </TabsTrigger>
              </TabsList>

              <TabsContent value="drivers">
                {drivers.error && !drivers.data ? (
                  <Notice title="Unable to load standings" message="Failed to load standings. Please try again." />
                ) : (
                  <DriverStandingsTable standings={drivers.data || []} loading={!drivers.data} />
                )}
              </TabsContent>
              <TabsContent value="constructors">
                {constructors.error && !constructors.data ? (
                  <Notice title="Unable to load standings" message="Failed to load standings. Please try again." />
                ) : (
                  <ConstructorStandingsTable standings={constructors.data || []} loading={!constructors.data} />
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
  if (loading && !standings.length) return null;
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

function ConstructorStandingsTable({ standings, loading }: { standings: ConstructorStanding[]; loading?: boolean }) {
  if (loading && !standings.length) return null;
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
