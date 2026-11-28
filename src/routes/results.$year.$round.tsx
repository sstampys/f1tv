import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  raceResultsRes,
  qualifyingRes,
  practiceRes,
  sprintRes,
  scheduleRes,
  formatRaceDateTime,
  sessionDateTime,
  type RaceResult,
  type QualifyingResult,
  type PracticeResult,
  type SprintResult,
  type Race,
  type SessionKey,
} from "@/lib/jolpica-api";
import { useResource } from "@/lib/data/use-resource";
import { ENDPOINTS, KEYS, TTL, resultsTtl } from "@/lib/data/config";
import { earlyFetchScript } from "@/lib/data/early";
import { loadErrorMessage, useLoadTimeout } from "@/lib/data/load-error";
import { Link } from "@tanstack/react-router";
import { LoadingSpinner } from "@/components/ui/loader-circle-icon";
import { ControlButton } from "@/components/ui/control-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/results/$year/$round")({
  validateSearch: (search: Record<string, unknown>) => ({}),
  head: () => ({
    meta: [
      { title: "Race Results" },
      { name: "description", content: "Formula 1 race results with positions, points, and fastest laps." },
      { property: "og:title", content: "Race Results — F1Box" },
      { property: "og:description", content: "Formula 1 race results with positions, points, and fastest laps." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "canonical", href: "https://www.f1box.org/results" },
    ],
    scripts: [
      {
        children: earlyFetchScript([
          { url: ENDPOINTS.seasons, key: KEYS.seasons, ttl: TTL.completedSeason },
        ]),
      },
    ],
  }),
  component: ResultsPage,
});

/** The name of a session, as the tab row writes it. */
function sessionLabel(tab: SessionKey): string {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

/** The grid a session's table is drawn on, so the columns are fixed. */
function tableVariant(tab: SessionKey): string {
  if (tab === "qualifying") return "results-table--6col";
  if (tab === "practice") return "results-table--6col-practice";
  return "results-table--7col";
}

/** The session timestamp. It changes in place with no animation. */
function SwapText({ value }: { value: string | null }) {
  return (
    <span className="swap-text">
      <span className="swap-text__layer">{value}</span>
    </span>
  );
}

function ResultsPage() {
  const { year, round } = Route.useParams();
  const results = useResource(raceResultsRes(year, round));
  const qualifying = useResource(qualifyingRes(year, round));
  const practice = useResource(practiceRes(year, round));
  const sprint = useResource(sprintRes(year, round));
  const schedule = useResource(scheduleRes(year));
  const [race, setRace] = useState<Race | null>(null);
  const [activeTab, setActiveTab] = useState<SessionKey>("race");

  useEffect(() => {
    if (schedule.data) {
      const found = schedule.data.find((r) => r.round === round);
      if (found) setRace(found);
    }
  }, [schedule.data, round]);

  // The sessions of the weekend, each with the resource that carries it.
  const sessions = { race: results, qualifying, practice, sprint } as const;
  // The cache key of each session: the load timeout watches it.
  const sessionKeys = {
    race: raceResultsRes(year, round).key,
    qualifying: qualifyingRes(year, round).key,
    practice: practiceRes(year, round).key,
    sprint: sprintRes(year, round).key,
  };

  // Determine available tabs based on data
  const availableTabs = useMemo(() => {
    const tabs: SessionKey[] = ["race"];
    if (qualifying.data && qualifying.data.length > 0) tabs.push("qualifying");
    if (practice.data && practice.data.length > 0) tabs.push("practice");
    if (sprint.data && sprint.data.length > 0) tabs.push("sprint");
    return tabs;
  }, [qualifying.data, practice.data, sprint.data]);

  // A session whose data has gone keeps the tab it was on out of the strip;
  // the race is always there to fall back to.
  const active = availableTabs.includes(activeTab) ? activeTab : "race";

  const formattedDate = useMemo(() => {
    if (!race) return null;
    // The timestamp follows the session on screen: the race's own date and
    // time for the race, the qualifying session's for qualifying, and so on.
    const when = sessionDateTime(race, active) ?? { date: race.date, time: race.time };
    return formatRaceDateTime(when.date, when.time, {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [race, active]);

  // No delay: the session swaps in the same frame (the active tab flips at
  // once). The incoming session's rows fade in with the reveal engine's normal
  // stagger; the time in the header changes instantly.
  const handleTab = (next: SessionKey) => {
    if (next === active) return;
    setActiveTab(next);
  };

  // The timestamp under the race name belongs to the session on screen, so it
  // changes with the tab. SwapText cross-fades it: the old time fades out as
  // the new one fades in, so the update is a dissolve instead of a cut.
  return (
    <div className="page">
      <section id="results" className="rows">
        <div className="page-container head" style={{ flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0 }}>
            <h1 data-reveal>{race?.raceName || "Race Results"}</h1>
            {race && (
              <p className="mute" data-reveal>
                {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country}
                <br />
                <SwapText value={formattedDate} />
              </p>
            )}
          </div>
          <Link to="/schedule" search={{ season: year }} className="control" data-reveal>
            ← Schedule
          </Link>
        </div>

        {/* The session on screen. The tab row is in the DOM from the first
            frame and stays there: it holds the default session from the start
            and the other sessions join it as they arrive, so the summary and
            the table never move and the race tab is never re-drawn. The row
            keeps the race tab even when the weekend turns out to have a single
            session or a sibling session fails to load, so the label never
            disappears from under the pointer once the results arrive. The
            results themselves are always here, so a race without a qualifying
            session still shows its results. */}
        <div className="page-container">
          <Tabs value={active} onValueChange={(v) => handleTab(v as SessionKey)}>
            {/* The tab row itself is a wrapper for its tabs, so it carries no
                reveal marker: the tabs inside it do the fading. */}
            <TabsList className="tabs-list">
              {availableTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab} data-reveal>
                  {sessionLabel(tab)}
                </TabsTrigger>
              ))}
            </TabsList>

            {availableTabs.map((tab) => (
              <TabsContent key={tab} value={tab}>
                {active === tab && (
                  <SessionPanel
                    tab={tab}
                    year={year}
                    round={round}
                    race={race}
                    session={sessions[tab]}
                    resourceKey={sessionKeys[tab]}
                    results={results.data ?? undefined}
                    qualifying={qualifying.data ?? undefined}
                    practice={practice.data ?? undefined}
                    sprint={sprint.data ?? undefined}
                  />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>
    </div>
  );
}

/**
 * One session: its summary line and its table.
 *
 * While the session is loading the page shows the same loading circle as the
 * rest of the site, and once the shared timeout has passed an error message
 * explains what is wrong — the API rate limit, or a website error.
 */
function SessionPanel({
  tab,
  year,
  round,
  race,
  session,
  resourceKey,
  results,
  qualifying,
  practice,
  sprint,
}: {
  tab: SessionKey;
  year: string;
  round: string;
  race: Race | null;
  session: { data: unknown[] | null; error: unknown };
  resourceKey: string;
  results: RaceResult[] | undefined;
  qualifying: QualifyingResult[] | undefined;
  practice: PracticeResult[] | undefined;
  sprint: SprintResult[] | undefined;
}) {
  const loading = !session.data && !session.error;
  const { slow, error: attemptError } = useLoadTimeout(resourceKey, loading);

  const data = (
    tab === "qualifying" ? qualifying :
    tab === "practice" ? practice :
    tab === "sprint" ? sprint :
    results
  ) as (RaceResult | QualifyingResult | PracticeResult | SprintResult)[] | undefined;

  return (
    <div className="session-panel">
      <SessionSummary
        activeTab={tab}
        race={race}
        results={results}
        qualifying={qualifying}
        practice={practice}
        sprint={sprint}
      />
      <div>
        {loading && !data ? (
          <>
            {/* The same grid the table will use, so the columns are fixed
                before a single row of data has arrived. */}
            <div className={`results-table ${tableVariant(tab)}`}>
              <div className="results-table__row results-table__head" data-reveal>
                <div className="results-table__cell">
                  <LoadingSpinner size={15} />
                </div>
              </div>
            </div>
            {slow && (
              <Notice
                title="Still loading"
                message={loadErrorMessage(attemptError, "the session results")}
                retry
              />
            )}
          </>
        ) : session.error ? (
          <Notice
            title="Unable to load results"
            message={loadErrorMessage(session.error, "the session results")}
            retry
          />
        ) : data && data.length > 0 ? (
          <ResultsTable
            key={`${year}-${round}-${tab}`}
            data={data}
            sessionType={tab}
            race={race}
            allResults={results}
            qualifying={qualifying}
          />
        ) : (
          <Notice title="No Results" message="No results available for this session." />
        )}
      </div>
    </div>
  );
}

function SessionSummary({
  activeTab,
  race,
  results,
  qualifying,
  practice,
  sprint,
}: {
  activeTab: SessionKey;
  race: Race | null;
  results: RaceResult[] | undefined | null;
  qualifying: QualifyingResult[] | undefined | null;
  practice: PracticeResult[] | undefined | null;
  sprint: SprintResult[] | undefined | null;
}) {
  const items = useMemo(() => {
    const parts: string[] = [];

    if (activeTab === "race" && results && results.length > 0) {
      const winner = results[0];
      const winnerLaps = winner.laps;
      const winnerTime = winner.Time?.time;
      const fastestLap = results.find((r) => r.FastestLap?.rank === "1");
      const fastestLapDriver = fastestLap ? `${fastestLap.Driver.givenName} ${fastestLap.Driver.familyName}` : null;
      const fastestLapTime = fastestLap?.FastestLap?.Time?.time;
      const fastestLapNumber = fastestLap?.FastestLap?.lap;

      if (winnerLaps) parts.push(`${winnerLaps} laps`);
      if (winnerTime) parts.push(`Winner ${winnerTime}`);
      if (fastestLapDriver && fastestLapTime && fastestLapNumber) {
        parts.push(`Fastest lap ${fastestLapDriver} ${fastestLapTime} (lap ${fastestLapNumber})`);
      }
    } else if (activeTab === "qualifying" && qualifying && qualifying.length > 0) {
      const pole = qualifying[0];
      const poleTime = pole.Q3 || pole.Q2 || pole.Q1;
      if (poleTime) parts.push(`Pole ${pole.Driver.givenName} ${pole.Driver.familyName} ${poleTime}`);
    } else if (activeTab === "practice" && practice && practice.length > 0) {
      const fastest = practice[0];
      if (fastest.time) parts.push(`Fastest ${fastest.Driver.givenName} ${fastest.Driver.familyName} ${fastest.time}`);
    } else if (activeTab === "sprint" && sprint && sprint.length > 0) {
      const winner = sprint[0];
      const winnerLaps = winner.laps;
      const winnerTime = winner.Time?.time;
      if (winnerLaps) parts.push(`${winnerLaps} laps`);
      if (winnerTime) parts.push(`Winner ${winnerTime}`);
    }

    return parts;
  }, [activeTab, results, qualifying, practice, sprint]);

  if (items.length === 0) return null;

  return (
    <div className="session-summary" data-reveal>
      <p className="mute">{items.join(" · ")}</p>
    </div>
  );
}

function ResultsTable({
  data,
  sessionType,
  race,
  allResults,
  qualifying,
}: {
  data: (RaceResult | QualifyingResult | PracticeResult | SprintResult)[];
  sessionType: SessionKey;
  race: Race | null;
  allResults: RaceResult[] | undefined;
  qualifying: QualifyingResult[] | undefined;
}) {
  if (sessionType === "race") {
    const raceResults = data as RaceResult[];
    return <RaceResultsTable results={raceResults} race={race} />;
  }
  if (sessionType === "qualifying") {
    const qualResults = data as QualifyingResult[];
    return <QualifyingTable results={qualResults} />;
  }
  if (sessionType === "practice") {
    const practiceResults = data as PracticeResult[];
    return <PracticeTable results={practiceResults} />;
  }
  if (sessionType === "sprint") {
    const sprintResults = data as SprintResult[];
    return <SprintResultsTable results={sprintResults} />;
  }
  return null;
}

function RaceResultsTable({ results, race }: { results: RaceResult[]; race: Race | null }) {
  return (
    <div className="results-table results-table--7col" role="table" aria-label="Race results">
      <div className="results-table__row results-table__head" role="row">
        <div className="results-table__cell" role="columnheader" data-reveal>Pos</div>
        <div className="results-table__cell" role="columnheader" data-reveal>Driver</div>
        <div className="results-table__cell results-table__cell--team" role="columnheader" data-reveal>Team</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Grid</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Laps</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Time</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Pts</div>
      </div>
      <div className="results-table__body" role="rowgroup">
        {results.map((result) => (
          <RaceResultRow key={result.Driver.driverId} result={result} />
        ))}
      </div>
    </div>
  );
}

function QualifyingTable({ results }: { results: QualifyingResult[] }) {
  return (
    <div className="results-table results-table--6col" role="table" aria-label="Qualifying results">
      <div className="results-table__row results-table__head" role="row">
        <div className="results-table__cell" role="columnheader" data-reveal>Pos</div>
        <div className="results-table__cell" role="columnheader" data-reveal>Driver</div>
        <div className="results-table__cell results-table__cell--team" role="columnheader" data-reveal>Team</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Q1</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Q2</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Q3</div>
      </div>
      <div className="results-table__body" role="rowgroup">
        {results.map((result) => (
          <QualifyingRow key={result.Driver.driverId} result={result} />
        ))}
      </div>
    </div>
  );
}

function PracticeTable({ results }: { results: PracticeResult[] }) {
  return (
    <div className="results-table results-table--6col-practice" role="table" aria-label="Practice results">
      <div className="results-table__row results-table__head" role="row">
        <div className="results-table__cell" role="columnheader" data-reveal>Pos</div>
        <div className="results-table__cell" role="columnheader" data-reveal>Driver</div>
        <div className="results-table__cell results-table__cell--team" role="columnheader" data-reveal>Team</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Best Time</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Gap</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Laps</div>
      </div>
      <div className="results-table__body" role="rowgroup">
        {results.map((result) => (
          <PracticeRow key={result.Driver.driverId} result={result} fastestTime={results[0]?.time} />
        ))}
      </div>
    </div>
  );
}

function SprintResultsTable({ results }: { results: SprintResult[] }) {
  return (
    <div className="results-table results-table--7col" role="table" aria-label="Sprint results">
      <div className="results-table__row results-table__head" role="row">
        <div className="results-table__cell" role="columnheader" data-reveal>Pos</div>
        <div className="results-table__cell" role="columnheader" data-reveal>Driver</div>
        <div className="results-table__cell results-table__cell--team" role="columnheader" data-reveal>Team</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Grid</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Laps</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Time</div>
        <div className="results-table__cell results-table__num" role="columnheader" data-reveal>Pts</div>
      </div>
      <div className="results-table__body" role="rowgroup">
        {results.map((result) => (
          <SprintResultRow key={result.Driver.driverId} result={result} />
        ))}
      </div>
    </div>
  );
}

/**
 * The Time cell: the driver's time, or what ended their race.
 *
 * The statuses the API publishes are spelled out — Disqualified, Did Not
 * Start, Not Classified, Did Not Finish, Retired — so the column reads as
 * words rather than as a code the visitor has to know.
 */
function timeCellFor(position: string, status: string, raceTime: string): string {
  const isWinner = position === "1";
  const isRetired = /ret|mechanical|accident|collision|engine|brakes|clutch|gearbox|electrical|oil leak|physical|throttle/i.test(status);
  const isDisqualified = /disqual/i.test(status);
  const isNotStarted = /did not start/i.test(status);
  const isNotClassified = /not classified/i.test(status);
  const isDidNotFinish = /did not finish/i.test(status);
  const isLapDown = /^\+\d+ Lap(s)?/i.test(status);

  if (isDisqualified) return "Disqualified";
  if (isNotStarted) return "Did Not Start";
  if (isNotClassified) return "Not Classified";
  if (isDidNotFinish) return "Did Not Finish";
  if (isRetired) return "Retired";
  if (isLapDown) return status;
  if (isWinner) return raceTime;
  if (raceTime) return raceTime;
  const isFinished = /^finished$/i.test(status);
  return status && !isFinished ? status : "";
}

function RaceResultRow({ result }: { result: RaceResult }) {
  const position = result.positionText || result.position;
  const gridPos = result.grid === "0" ? "Pit Lane" : `P${result.grid}`;
  const status = result.status || "";
  const raceTime = result.Time?.time || "";

  const getDriverNumber = (driver: { permanentNumber?: string }): string => {
    const number = driver.permanentNumber?.trim();
    return number ? `#${number}` : "";
  };

  const timeCell = timeCellFor(position, status, raceTime);

  return (
    <div className="results-table__row" role="row" data-reveal>
      <div className="results-table__cell" role="cell">{position}</div>
      <div className="results-table__cell" role="cell">
        <div className="driver">
          <div className="driver__name">
            <p>{result.Driver.givenName} {result.Driver.familyName}</p>
            <p className="mute">{getDriverNumber(result.Driver)}</p>
          </div>
        </div>
      </div>
      <div className="results-table__cell results-table__cell--team" role="cell">{result.Constructor.name}</div>
      <div className="results-table__cell results-table__num" role="cell">{gridPos}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.laps}</div>
      <div className="results-table__cell results-table__num" role="cell">{timeCell}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.points}</div>
    </div>
  );
}

function QualifyingRow({ result }: { result: QualifyingResult }) {
  const position = result.positionText || result.position;
  const getDriverNumber = (driver: { permanentNumber?: string }): string => {
    const number = driver.permanentNumber?.trim();
    return number ? `#${number}` : "";
  };

  return (
    <div className="results-table__row" role="row" data-reveal>
      <div className="results-table__cell" role="cell">{position}</div>
      <div className="results-table__cell" role="cell">
        <div className="driver">
          <div className="driver__name">
            <p>{result.Driver.givenName} {result.Driver.familyName}</p>
            <p className="mute">{getDriverNumber(result.Driver)}</p>
          </div>
        </div>
      </div>
      <div className="results-table__cell results-table__cell--team" role="cell">{result.Constructor.name}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.Q1 || ""}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.Q2 || ""}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.Q3 || ""}</div>
    </div>
  );
}

function PracticeRow({ result, fastestTime }: { result: PracticeResult; fastestTime?: string }) {
  const position = result.positionText || result.position;
  const getDriverNumber = (driver: { permanentNumber?: string }): string => {
    const number = driver.permanentNumber?.trim();
    return number ? `#${number}` : "";
  };

  let gapCell = "";
  if (result.time && fastestTime && result.time !== fastestTime) {
    // Calculate gap - this is a simplified version
    gapCell = `+${result.time}`; // Placeholder - would need proper time parsing
  } else if (result.time === fastestTime) {
    gapCell = "—";
  }

  return (
    <div className="results-table__row" role="row" data-reveal>
      <div className="results-table__cell" role="cell">{position}</div>
      <div className="results-table__cell" role="cell">
        <div className="driver">
          <div className="driver__name">
            <p>{result.Driver.givenName} {result.Driver.familyName}</p>
            <p className="mute">{getDriverNumber(result.Driver)}</p>
          </div>
        </div>
      </div>
      <div className="results-table__cell results-table__cell--team" role="cell">{result.Constructor.name}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.time || ""}</div>
      <div className="results-table__cell results-table__num" role="cell">{gapCell}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.laps || ""}</div>
    </div>
  );
}

function SprintResultRow({ result }: { result: SprintResult }) {
  const position = result.positionText || result.position;
  const gridPos = result.grid === "0" ? "Pit Lane" : `P${result.grid}`;
  const status = result.status || "";
  const raceTime = result.Time?.time || "";

  const getDriverNumber = (driver: { permanentNumber?: string }): string => {
    const number = driver.permanentNumber?.trim();
    return number ? `#${number}` : "";
  };

  const timeCell = timeCellFor(position, status, raceTime);

  return (
    <div className="results-table__row" role="row" data-reveal>
      <div className="results-table__cell" role="cell">{position}</div>
      <div className="results-table__cell" role="cell">
        <div className="driver">
          <div className="driver__name">
            <p>{result.Driver.givenName} {result.Driver.familyName}</p>
            <p className="mute">{getDriverNumber(result.Driver)}</p>
          </div>
        </div>
      </div>
      <div className="results-table__cell results-table__cell--team" role="cell">{result.Constructor.name}</div>
      <div className="results-table__cell results-table__num" role="cell">{gridPos}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.laps}</div>
      <div className="results-table__cell results-table__num" role="cell">{timeCell}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.points}</div>
    </div>
  );
}

/** The notice sits inside the page container already, so it adds no width. */
function Notice({ title, message, retry }: { title: string; message: string; retry?: boolean }) {
  return (
    <div className="stack-tight">
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