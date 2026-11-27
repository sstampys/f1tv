import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  raceResultsRes,
  scheduleRes,
  formatRaceDateTime,
  type RaceResult,
  type Race,
} from "@/lib/jolpica-api";
import { useResource } from "@/lib/data/use-resource";
import { ENDPOINTS, KEYS, TTL, resultsTtl } from "@/lib/data/config";
import { earlyFetchScript } from "@/lib/data/early";
import { Link } from "@tanstack/react-router";

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
  const schedule = useResource(scheduleRes(year));
  const [race, setRace] = useState<Race | null>(null);

  // Find the specific race from the schedule
  useEffect(() => {
    if (schedule.data) {
      const found = schedule.data.find((r) => r.round === round);
      if (found) setRace(found);
    }
  }, [schedule.data, round]);

  const formattedDate = race
    ? formatRaceDateTime(race.date, race.time, { weekday: "short", month: "long", day: "numeric", year: "numeric" })
    : null;

  // Determine overall fastest lap across all results
  const fastestLapOverall = useMemo(() => {
    if (!results.data) return null;
    let fastest: RaceResult | null = null;
    for (const r of results.data) {
      if (r.FastestLap && r.FastestLap.rank === "1") {
        return r;
      }
      if (r.FastestLap && !fastest) {
        fastest = r;
      }
    }
    return fastest;
  }, [results.data]);

  return (
    <div className="page">
      <section id="results" className="rows">
        <div className="page-container head">
          <div>
            <h1 data-reveal>{race?.raceName || "Race Results"}</h1>
            {race && (
              <p className="mute" data-reveal>
                {race.Circuit.circuitName}, {race.Circuit.Location.locality}, {race.Circuit.Location.country} · {formattedDate}
              </p>
            )}
          </div>
          <Link to="/schedule" className="control" data-reveal>
            ← Schedule
          </Link>
        </div>

        {!results.data && !results.error ? (
          <div className="page-container stack-tight">
            <p data-reveal>Loading results…</p>
          </div>
        ) : results.error ? (
          <Notice title="Unable to load results" message="Failed to load race results. Please try again." retry />
        ) : results.data && results.data.length > 0 ? (
          <ResultsList key={`${year}-${round}`} results={results.data} fastestLapOverall={fastestLapOverall} />
        ) : (
          <Notice title="No Results" message="No results available for this race." />
        )}

        <div className="page-container stream-links">
          <Link to="/standings" className="link" data-reveal>
            Driver Standings
          </Link>
          <Link to="/schedule" className="link" data-reveal>
            Race Schedule
          </Link>
        </div>
      </section>
    </div>
  );
}

function ResultsList({ results, fastestLapOverall }: { results: RaceResult[]; fastestLapOverall: RaceResult | null }) {
  return (
    <div className="results-list">
      {results.map((result) => (
        <ResultRow key={result.Driver.driverId} result={result} isFastestOverall={fastestLapOverall?.Driver.driverId === result.Driver.driverId} />
      ))}
    </div>
  );
}

function ResultRow({ result, isFastestOverall }: { result: RaceResult; isFastestOverall: boolean }) {
  const position = result.positionText || result.position;
  const points = result.points ? `${result.points} pts` : "0 pts";
  const isZeroPoints = result.points === "0" || result.points === "" || !result.points;
  const gridPos = result.grid === "0" ? "Pit Lane" : `Grid P${result.grid}`;
  const laps = result.laps ? `${result.laps} laps` : "—";
  const status = result.status || "—";
  const fl = result.FastestLap;
  const hasFastestLap = fl && fl.Time && fl.Time.time;
  const fastestLapText = hasFastestLap
    ? `FL ${fl.Time.time}${fl.lap ? ` · L${fl.lap}` : ""}`
    : "—";

  return (
    <div className="result-row" data-reveal>
      <div className="result-row__pos">
        <span className="pos-num">{position}</span>
      </div>
      <div className="result-row__primary">
        <div className="result-row__driver-line">
          <span className="driver-name">{result.Driver.givenName} {result.Driver.familyName}</span>
          {result.Driver.code && <span className="driver-code">{result.Driver.code}</span>}
          <span className="driver-team">{result.Constructor.name}</span>
        </div>
        <div className="result-row__meta-line">
          {result.Driver.nationality && <span className="driver-nationality">{result.Driver.nationality}</span>}
          <span className="driver-grid">{gridPos}</span>
          <span className="driver-laps">{laps}</span>
        </div>
      </div>
      <div className="result-row__summary">
        <div className="result-row__points-line">
          <span className={`points ${isZeroPoints ? "mute" : ""}`}>{points}</span>
          <span className="status">{status}</span>
        </div>
        <div className="result-row__fastest-line">
          <span className={`fastest-lap ${isFastestOverall ? "fastest-overall" : ""}`}>{fastestLapText}</span>
        </div>
      </div>
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