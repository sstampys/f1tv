import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
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
import { loadErrorMessage, useLoadTimeout } from "@/lib/data/load-error";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SystemSelect } from "@/components/ui/system-select";
import { LoadingSpinner } from "@/components/ui/loader-circle-icon";
import { ControlButton } from "@/components/ui/control-button";
import { asSeason, setSeason, useSeason } from "@/lib/season";

export const Route = createFileRoute("/standings")({
  // The season travels in the URL, so it survives a reload, a shared link and
  // the browser's back button.
  validateSearch: (search: Record<string, unknown>): { season?: string } => {
    const season = asSeason(search.season);
    return season ? { season } : {};
  },
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
  const search = Route.useSearch();
  // The URL is the source of truth, but only a real year counts: a hand
  // typed ?season=abc falls back to the season the visitor picked before.
  const seasonParam = asSeason(search.season);
  const navigate = useNavigate();
  // The season the visitor last chose, for routes opened without a parameter.
  const remembered = useSeason();
  const season = seasonParam ?? remembered ?? currentSeason;
  const [tab, setTab] = useState("drivers");

  // A season in the URL is remembered, so the navigation pill and the routes
  // without a selector carry it along. A value that is not a year is dropped
  // and the address bar is corrected to the season on screen.
  useEffect(() => {
    if (seasonParam) {
      setSeason(seasonParam);
      return;
    }
    if (!season) return;
    if (search.season !== undefined || (remembered && remembered !== currentSeason)) {
      navigate({ to: "/standings", search: { season }, replace: true });
    }
  }, [seasonParam, remembered, currentSeason, search.season, season, navigate]);

  const seasons = useResource(seasonsRes);
  const drivers = useResource(driverStandingsRes(season));
  const constructors = useResource(constructorStandingsRes(season));

  const anyError = drivers.error || constructors.error;
  const hasData = !!(drivers.data || constructors.data);

  // The tables have been waiting longer than the shared timeout: the spinner
  // has said enough and the page owes the visitor an explanation.
  const driverLoad = useLoadTimeout(
    driverStandingsRes(season).key,
    !drivers.data && !drivers.error,
  );
  const constructorLoad = useLoadTimeout(
    constructorStandingsRes(season).key,
    !constructors.data && !constructors.error,
  );

  // The tab strip is static chrome. Once it has appeared it must never unmount,
  // so switching season — which clears that season's data — cannot replay its
  // reveal animation. Only the tables inside the tabs change.
  const [tabsReady, setTabsReady] = useState(false);
  useEffect(() => {
    if (hasData) setTabsReady(true);
  }, [hasData]);

  // No animation: the season or tab swaps in the same frame and the incoming
  // table is shown at once (data-immediate), with no fade and no wait. Rows
  // below the fold still reveal when scrolled to. The first load keeps the
  // normal reveal; only a switch is instant.
  const switched = useRef(false);
  const handleSeason = (next: string) => {
    if (next === season) return;
    switched.current = true;
    navigate({ to: "/standings", search: { season: next }, replace: true });
  };

  const handleTab = (next: string) => {
    if (next === tab) return;
    switched.current = true;
    setTab(next);
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
            <Notice
              title="Unable to load standings"
              message={loadErrorMessage(anyError, "the standings")}
              retry
            />
          ) : null
        ) : (
          <div className="page-container">
            <Tabs value={tab} onValueChange={handleTab}>
              <TabsList className="tabs-list" data-reveal>
                <TabsTrigger value="drivers" data-reveal>Drivers</TabsTrigger>
                <TabsTrigger value="constructors" data-reveal>Constructors</TabsTrigger>
              </TabsList>

              <TabsContent value="drivers">
                {drivers.error && !drivers.data ? (
                  <Notice
                    title="Unable to load standings"
                    message={loadErrorMessage(drivers.error, "the standings")}
                    inTable
                  />
                ) : (
                  <div data-immediate={switched.current ? "" : undefined}>
                    <DriverStandingsTable
                      key={`drivers-${season}`}
                      standings={drivers.data || []}
                      loading={!drivers.data}
                      slow={driverLoad.slow ? loadErrorMessage(driverLoad.error, "the standings") : undefined}
                    />
                  </div>
                )}
              </TabsContent>
              <TabsContent value="constructors">
                {constructors.error && !constructors.data ? (
                  <Notice
                    title="Unable to load standings"
                    message={loadErrorMessage(constructors.error, "the standings")}
                    inTable
                  />
                ) : (
                  <div data-immediate={switched.current ? "" : undefined}>
                    <ConstructorStandingsTable
                      key={`constructors-${season}`}
                      standings={constructors.data || []}
                      loading={!constructors.data}
                      slow={constructorLoad.slow ? loadErrorMessage(constructorLoad.error, "the standings") : undefined}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Table head chrome. It mounts with the table (never with the loading
 * skeleton). The header cells are individual reveal leaves so they stagger
 * left-to-right like the rest of the page.
 */
function RevealHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

function DriverStandingsTable({
  standings,
  loading,
  slow,
}: {
  standings: DriverStanding[];
  loading?: boolean;
  /** Set when the load has outlasted the shared timeout. */
  slow?: string;
}) {
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
        {slow && (
          <tbody>
            <Notice title="Still loading" message={slow} retry inTable />
          </tbody>
        )}
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
      <RevealHead>
        <tr>
          <th className="col-pos" data-reveal>Pos</th>
          <th data-reveal>Driver</th>
          <th data-reveal>Team</th>
          <th className="col-num num" data-reveal>Points</th>
          <th className="col-num num" data-reveal>Wins</th>
        </tr>
      </RevealHead>
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

function ConstructorStandingsTable({
  standings,
  loading,
  slow,
}: {
  standings: ConstructorStanding[];
  loading?: boolean;
  /** Set when the load has outlasted the shared timeout. */
  slow?: string;
}) {
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
        {slow && (
          <tbody>
            <Notice title="Still loading" message={slow} retry inTable />
          </tbody>
        )}
      </table>
    );
  }

  return (
    <table className="table">
      <RevealHead>
        <tr>
          <th className="col-pos" data-reveal>Pos</th>
          <th data-reveal>Constructor</th>
          <th data-reveal></th>
          <th className="col-num num" data-reveal>Points</th>
          <th className="col-num num" data-reveal>Wins</th>
        </tr>
      </RevealHead>
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
              <ControlButton onClick={() => window.location.reload()}>Try Again</ControlButton>
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
          <ControlButton onClick={() => window.location.reload()}>Try Again</ControlButton>
        </p>
      )}
    </div>
  );
}
