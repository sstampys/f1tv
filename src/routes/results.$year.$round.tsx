import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  raceResultsRes,
  qualifyingRes,
  practiceRes,
  sprintRes,
  scheduleRes,
  formatRaceDateTime,
  type RaceResult,
  type QualifyingResult,
  type PracticeResult,
  type SprintResult,
  type Race,
} from "@/lib/jolpica-api";
import { useResource } from "@/lib/data/use-resource";
import { ENDPOINTS, KEYS, TTL, resultsTtl } from "@/lib/data/config";
import { earlyFetchScript } from "@/lib/data/early";
import { Link } from "@tanstack/react-router";
import { LoadingSpinner } from "@/components/ui/loader-circle-icon";
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

function ResultsPage() {
  const { year, round } = Route.useParams();
  const results = useResource(raceResultsRes(year, round));
  const qualifying = useResource(qualifyingRes(year, round));
  const practice = useResource(practiceRes(year, round));
  const sprint = useResource(sprintRes(year, round));
  const schedule = useResource(scheduleRes(year));
  const [race, setRace] = useState<Race | null>(null);
  const [activeTab, setActiveTab] = useState<"race" | "qualifying" | "practice" | "sprint">("race");

  useEffect(() => {
    if (schedule.data) {
      const found = schedule.data.find((r) => r.round === round);
      if (found) setRace(found);
    }
  }, [schedule.data, round]);

  const formattedDate = race
    ? formatRaceDateTime(race.date, race.time, { weekday: "short", month: "long", day: "numeric", year: "numeric" })
    : null;

  // Determine available tabs based on data
  const availableTabs = useMemo(() => {
    const tabs: Array<"race" | "qualifying" | "practice" | "sprint"> = ["race"];
    if (qualifying.data && qualifying.data.length > 0) tabs.push("qualifying");
    if (practice.data && practice.data.length > 0) tabs.push("practice");
    if (sprint.data && sprint.data.length > 0) tabs.push("sprint");
    return tabs;
  }, [qualifying.data, practice.data, sprint.data]);

  return (
    <div className="page">
      <section id="results" className="rows">
        <div className="page-container head" style={{ flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0 }}>
            <h1 data-reveal>{race?.raceName || "Race Results"}</h1>
            {race && (
              <p className="mute" data-reveal>
                {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country} ·{" "}
                <span style={{ whiteSpace: "nowrap" }}>{formattedDate}</span>
              </p>
            )}
          </div>
          <Link to="/schedule" className="control" data-reveal>
            ← Schedule
          </Link>
        </div>

        {/* Session Tabs */}
        {availableTabs.length > 1 && (
          <div className="page-container">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="tabs-list" data-reveal>
                {availableTabs.map((tab) => (
                  <TabsTrigger key={tab} value={tab} data-reveal>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {availableTabs.map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {activeTab === tab && (
                    <>
                      <SessionSummary
                        activeTab={tab}
                        race={race}
                        results={results.data as RaceResult[] | undefined}
                        qualifying={qualifying.data as QualifyingResult[] | undefined}
                        practice={practice.data as PracticeResult[] | undefined}
                        sprint={sprint.data as SprintResult[] | undefined}
                      />
                      <div>
                        {(() => {
                          let currentData: (RaceResult | QualifyingResult | PracticeResult | SprintResult)[] | undefined;
                          let currentError: unknown;
                          let isLoading: boolean;
                          switch (tab) {
                            case "qualifying":
                              currentData = qualifying.data ?? undefined;
                              currentError = qualifying.error;
                              isLoading = !qualifying.data && !qualifying.error;
                              break;
                            case "practice":
                              currentData = practice.data ?? undefined;
                              currentError = practice.error;
                              isLoading = !practice.data && !practice.error;
                              break;
                            case "sprint":
                              currentData = sprint.data ?? undefined;
                              currentError = sprint.error;
                              isLoading = !sprint.data && !sprint.error;
                              break;
                            default:
                              currentData = results.data ?? undefined;
                              currentError = results.error;
                              isLoading = !results.data && !results.error;
                          }
                          if (isLoading && !currentData) {
                            return (
                              <div className="results-table">
                                <div className="results-table__row results-table__head" data-reveal>
                                  <div className="results-table__cell">
                                    <LoadingSpinner size={15} />
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          if (currentError) {
                            return (
                              <Notice title="Unable to load results" message="Failed to load session results. Please try again." retry />
                            );
                          }
                          if (currentData && currentData.length > 0) {
                            return (
                              <ResultsTable
                                key={`${year}-${round}-${tab}`}
                                data={currentData as (RaceResult | QualifyingResult | PracticeResult | SprintResult)[]}
                                sessionType={tab}
                                race={race}
                                allResults={results.data ?? undefined}
                                qualifying={qualifying.data ?? undefined}
                              />
                            );
                          }
                          return <Notice title="No Results" message="No results available for this session." />;
                        })()}
                      </div>
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </section>
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
  activeTab: "race" | "qualifying" | "practice" | "sprint";
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
  sessionType: "race" | "qualifying" | "practice" | "sprint";
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

function RaceResultRow({ result }: { result: RaceResult }) {
  const position = result.positionText || result.position;
  const gridPos = result.grid === "0" ? "Pit Lane" : `P${result.grid}`;
  const status = result.status || "";
  const raceTime = result.Time?.time || "";
  const isWinner = position === "1";

  const isRetired = /ret|mechanical|accident|collision|engine|brakes|clutch|gearbox|electrical|oil leak|physical|throttle/i.test(status);
  const isDisqualified = /disqual/i.test(status);
  const isNotStarted = /did not start/i.test(status);
  const isNotClassified = /not classified/i.test(status);
  const isDidNotFinish = /did not finish/i.test(status);
  const isLapDown = /^\+\d+ Lap(s)?/i.test(status);

  const getDriverNumber = (driver: { permanentNumber?: string }): string => {
    const number = driver.permanentNumber?.trim();
    return number ? `#${number}` : "";
  };

  let timeCell: string;
  if (isDisqualified) {
    timeCell = "DSQ";
  } else if (isNotStarted) {
    timeCell = "DNS";
  } else if (isNotClassified) {
    timeCell = "NC";
  } else if (isDidNotFinish) {
    timeCell = "DNF";
  } else if (isRetired) {
    timeCell = "RET";
  } else if (isLapDown) {
    timeCell = status;
  } else if (isWinner) {
    timeCell = raceTime;
  } else if (raceTime) {
    timeCell = raceTime;
  } else {
    const isFinished = /^finished$/i.test(status);
    timeCell = status && !isFinished ? status : "";
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
  const isWinner = position === "1";

  const isRetired = /ret|mechanical|accident|collision|engine|brakes|clutch|gearbox|electrical|oil leak|physical|throttle/i.test(status);
  const isDisqualified = /disqual/i.test(status);
  const isNotStarted = /did not start/i.test(status);
  const isNotClassified = /not classified/i.test(status);
  const isDidNotFinish = /did not finish/i.test(status);
  const isLapDown = /^\+\d+ Lap(s)?/i.test(status);

  const getDriverNumber = (driver: { permanentNumber?: string }): string => {
    const number = driver.permanentNumber?.trim();
    return number ? `#${number}` : "";
  };

  let timeCell: string;
  if (isDisqualified) {
    timeCell = "DSQ";
  } else if (isNotStarted) {
    timeCell = "DNS";
  } else if (isNotClassified) {
    timeCell = "NC";
  } else if (isDidNotFinish) {
    timeCell = "DNF";
  } else if (isRetired) {
    timeCell = "RET";
  } else if (isLapDown) {
    timeCell = status;
  } else if (isWinner) {
    timeCell = raceTime;
  } else if (raceTime) {
    timeCell = raceTime;
  } else {
    const isFinished = /^finished$/i.test(status);
    timeCell = status && !isFinished ? status : "";
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
      <div className="results-table__cell results-table__num" role="cell">{gridPos}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.laps}</div>
      <div className="results-table__cell results-table__num" role="cell">{timeCell}</div>
      <div className="results-table__cell results-table__num" role="cell">{result.points}</div>
    </div>
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