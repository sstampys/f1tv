import { createFileRoute } from "@tanstack/react-router";
import {
  raceResultsRes,
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

  return (
    <div className="page">
      <section id="results" className="rows">
        <div className="page-container head">
          <h1 data-reveal>Race Results</h1>
          <Link to="/schedule" className="control" data-reveal>
            Back to Schedule
          </Link>
        </div>

        {!results.data && !results.error ? (
          <div className="page-container stack-tight">
            <p data-reveal>Loading results…</p>
          </div>
        ) : results.error ? (
          <Notice title="Unable to load results" message="Failed to load race results. Please try again." retry />
        ) : results.data && results.data.length > 0 ? (
          <ResultsTable key={`${year}-${round}`} results={results.data} />
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

function ResultsTable({ results }: { results: RaceResult[] }) {
  return (
    <table className="table">
      <thead>
        <tr data-reveal>
          <th className="col-pos">Pos</th>
          <th>Driver</th>
          <th>Team</th>
          <th className="col-num num">Points</th>
          <th className="col-num num">Grid</th>
          <th className="col-num num">Laps</th>
          <th>Status</th>
          <th>Fastest Lap</th>
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
  const fastestLap = result.FastestLap
    ? `${result.FastestLap.lap} (${result.FastestLap.Time.time}${result.FastestLap.Time.averageSpeed ? ` • ${result.FastestLap.Time.averageSpeed.speed} ${result.FastestLap.Time.averageSpeed.units}` : ""})`
    : "—";

  return (
    <tr data-reveal>
      <td>{position}</td>
      <td>
        <div className="driver">
          <span className="driver__code" aria-hidden="true">{result.Driver.code || ""}</span>
          <div className="driver__name">
            <p>{result.Driver.givenName} {result.Driver.familyName}</p>
            <p className="mute">{result.Driver.nationality}</p>
          </div>
        </div>
      </td>
      <td>{result.Constructor.name}</td>
      <td className="num">{result.points}</td>
      <td className="num">{result.grid}</td>
      <td className="num">{result.laps}</td>
      <td className="mute">{result.status}</td>
      <td className="mute">{fastestLap}</td>
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