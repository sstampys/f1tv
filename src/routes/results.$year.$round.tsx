import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (schedule.data) {
      const found = schedule.data.find((r) => r.round === round);
      if (found) setRace(found);
    }
  }, [schedule.data, round]);

  const formattedDate = race
    ? formatRaceDateTime(race.date, race.time, { weekday: "short", month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="page">
      <section id="results" className="rows">
        <div className="page-container head" style={{ flexWrap: "nowrap" }}>
          <div style={{ minWidth: 0 }}>
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

        <div className="page-container">
          {!results.data && !results.error ? (
            <div className="stack-tight">
              <p data-reveal>Loading results…</p>
            </div>
          ) : results.error ? (
            <Notice title="Unable to load results" message="Failed to load race results. Please try again." retry />
          ) : results.data && results.data.length > 0 ? (
            <ResultsTable key={`${year}-${round}`} results={results.data} />
          ) : (
            <Notice title="No Results" message="No results available for this race." />
          )}
        </div>
      </section>
    </div>
  );
}

function ResultsTable({ results }: { results: RaceResult[] }) {
  return (
    <table className="table">
      <thead>
        <tr data-reveal>
          <th className="col-pos">Pos</th>
          <th>Driver</th>
          <th>Team</th>
          <th className="col-num num">Grid</th>
          <th className="col-num num">Points</th>
          <th className="col-num num">Time</th>
        </tr>
      </thead>
      <tbody>
        {results.map((result) => (
          <ResultRow key={result.Driver.driverId} result={result} />
        ))}
      </tbody>
    </table>
  );
}

function ResultRow({ result }: { result: RaceResult }) {
  const position = result.positionText || result.position;
  const gridPos = result.grid === "0" ? "Pit Lane" : `P${result.grid}`;
  const raceTime = result.Time?.time || "";
  const isWinner = position === "1";

  // Team name shortening: remove " F1 Team" suffix and map known alternatives
  const teamName = (() => {
    const name = result.Constructor.name;
    const map: Record<string, string> = {
      "Haas F1 Team": "Haas",
      "RB F1 Team": "Racing Bulls",
      "Alpine F1 Team": "Alpine",
    };
    if (map[name]) return map[name];
    return name.replace(/ F1 Team$/, "");
  })();

  const status = result.status || "";
  const isClassified = /^\d/.test(status) || status === "Finished";
  const isRetired = /ret|mechanical|accident|collision|engine|brakes|clutch|gearbox|electrical|oil leak|physical|throttle/i.test(status);
  const isDisqualified = /disqual/i.test(status);
  const isNotStarted = /did not start/i.test(status);
  const isNotClassified = /not classified/i.test(status);
  const isDidNotFinish = /did not finish/i.test(status);
  const isLapDown = /^\+\d+ Lap(s)?/i.test(status);

  let timeCell: string;
  if (isWinner) {
    timeCell = raceTime;
  } else if (isDisqualified) {
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
  } else if (isClassified && raceTime) {
    timeCell = raceTime;
  } else {
    timeCell = "";
  }

  return (
    <tr data-reveal>
      <td>{position}</td>
      <td>
        <div className="driver">
          <div className="driver__name">
            <p>{result.Driver.givenName} {result.Driver.familyName}</p>
          </div>
        </div>
      </td>
      <td>{teamName}</td>
      <td className="num">{gridPos}</td>
      <td className="num">{result.points}</td>
      <td className="num">{timeCell}</td>
    </tr>
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