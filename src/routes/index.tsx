import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GrandPrixCountdown } from "../components/GrandPrixCountdown";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { demo?: boolean } => ({
    demo: search.demo === "1" || search.demo === 1 || search.demo === true ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "F1TV" },
      { name: "description", content: "Live Formula 1 Stream" },
      { property: "og:title", content: "F1TV" },
      { property: "og:description", content: "Live Formula 1 Stream" },
    ],
  }),
  component: Index,
});

type Substream = {
  source_tag?: string;
  tag?: string;
  iframe?: string;
};

type Stream = {
  id: number;
  name: string;
  uri_name: string;
  iframe?: string;
  tag?: string;
  source_tag?: string;
  substreams?: Substream[];
  category_name: string;
  always_live: number;
  starts_at: number;
  ends_at: number;
};

type Category = {
  category: string;
  streams: Stream[];
};

function isF1(s: Stream) {
  // Match on the event name only — the "Motorsports" category also carries
  // non-F1 events (motocross, etc.) which must not be picked up.
  const hay = s.name.toLowerCase();
  return /\bf1\b|formula\s*1|grand\s*prix/.test(hay);
}

function labelOf(x: { source_tag?: string; tag?: string }) {
  return (x.source_tag || x.tag || "Default").trim();
}

function isAppleTv(x: { source_tag?: string; tag?: string }) {
  return /apple\s*tv|appletv|\batv\b/.test(labelOf(x).toLowerCase());
}

function isSkySports(x: { source_tag?: string; tag?: string }) {
  return /sky\s*sports|\bsky\b/.test(labelOf(x).toLowerCase());
}

async function fetchF1Streams(): Promise<Stream[]> {
  const res = await fetch("https://api.ppv.st/api/streams", { cache: "no-store" });
  const data = await res.json();
  const cats: Category[] = data?.streams ?? [];
  const now = Math.floor(Date.now() / 1000);
  const all = cats.flatMap((c) =>
    c.streams.map((s) => ({ ...s, category_name: s.category_name || c.category })),
  );
  const f1 = all.filter(isF1);
  // Only show a stream that is actually live (with a 15 min pre-roll window).
  // Otherwise fall through to the countdown.
  const live = f1.filter(
    (s) => s.always_live === 1 || (s.starts_at - 900 <= now && s.ends_at >= now),
  );
  return live;
}

function extractIframeSrc(iframe?: string): string | null {
  if (!iframe) return null;
  const m = iframe.match(/src=["']([^"']+)["']/i);
  if (m) return m[1];
  if (/^https?:\/\//i.test(iframe)) return iframe;
  return null;
}

type Source = { label: string; src: string };

function buildSources(streams: Stream[]): Source[] {
  const out: Source[] = [];
  const seen = new Set<string>();
  for (const s of streams) {
    const candidates: Array<{ source_tag?: string; tag?: string; iframe?: string }> = [
      { source_tag: s.source_tag, tag: s.tag, iframe: s.iframe },
      ...(s.substreams ?? []),
    ];
    for (const c of candidates) {
      const src = extractIframeSrc(c.iframe) ?? (c === candidates[0] ? `https://ppv.st/live/${s.uri_name}` : null);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      out.push({ label: labelOf(c), src });
    }
  }
  // Sky Sports first, then Apple TV, then the rest
  return out.sort((a, b) => rank(a) - rank(b));
}

function rank(s: Source) {
  if (isSkySports({ source_tag: s.label })) return 0;
  if (isAppleTv({ source_tag: s.label })) return 1;
  return 2;
}

const DEMO_LABELS = ["Sky Sports", "Apple TV", "F1 TV Pro"];

// Playable sample feeds used by ?demo=1. The real ppv embeds refuse to run
// inside a sandboxed frame (the Lovable preview), which renders as a black
// screen — these always play, so source switching can actually be verified.
const DEMO_SAMPLE_SRCS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
];

function makeDemoStream(srcs: string[]): Stream[] {
  if (!srcs.length) return [];
  const [primary, ...rest] = srcs;
  return [
    {
      id: -1,
      name: "Demo Grand Prix",
      uri_name: "demo/grand-prix",
      category_name: "Motorsports",
      always_live: 1,
      starts_at: 0,
      ends_at: 0,
      source_tag: DEMO_LABELS[0],
      tag: "Motorsports",
      iframe: primary,
      substreams: rest.map((src, i) => ({
        source_tag: DEMO_LABELS[i + 1],
        tag: "Motorsports",
        iframe: src,
      })),
    },
  ];
}

// ?demo=ppv — 3 random real 24/7 ppv channels, one per source label.
async function fetchDemoStreams(): Promise<Stream[]> {
  const res = await fetch("https://api.ppv.st/api/streams", { cache: "no-store" });
  const data = await res.json();
  const cats: Category[] = data?.streams ?? [];
  const all = cats.flatMap((c) =>
    c.streams.map((s) => ({ ...s, category_name: s.category_name || c.category })),
  );
  const alwaysLive = all.filter((s) => Number(s.always_live) === 1 && s.iframe);
  const shuffled = [...alwaysLive].sort(() => Math.random() - 0.5).slice(0, 3);
  const srcs = shuffled
    .map((s) => extractIframeSrc(s.iframe))
    .filter((s): s is string => Boolean(s));
  return makeDemoStream(srcs);
}



function Index() {
  const { demo } = Route.useSearch();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    if (demo) {
      let cancelled = false;
      fetchDemoStreams()
        .then((s) => {
          if (!cancelled) {
            setStreams(s);
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));
      return () => {
        cancelled = true;
      };
    }
    let cancelled = false;
    const load = async () => {
      try {
        const s = await fetchF1Streams();
        if (!cancelled) {
          setStreams((prev) => {
            const sameIds = prev.map((p) => p.id).join(",") === s.map((p) => p.id).join(",");
            return sameIds ? prev : s;
          });
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [demo]);

  const sources = buildSources(streams);
  const iframeSrc = selected && sources.some((s) => s.src === selected) ? selected : (sources[0]?.src ?? null);


  // Mirror typical player-control auto-hide behavior
  useEffect(() => {
    if (!iframeSrc) return;
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      setControlsVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setControlsVisible(false), 3000);
    };
    show();
    window.addEventListener("mousemove", show);
    window.addEventListener("touchstart", show);
    window.addEventListener("keydown", show);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", show);
      window.removeEventListener("touchstart", show);
      window.removeEventListener("keydown", show);
    };
  }, [iframeSrc]);

  return (
    <div style={{ backgroundColor: "#000", minHeight: "100dvh", width: "100%", margin: 0, padding: 0, overflowY: "auto" }}>
      {/* Show countdown inside the dynamic wrapper when no stream is available */}
      {!loading && !iframeSrc && <GrandPrixCountdown />}

      {iframeSrc && (
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={streams[0]?.name ?? "F1 Live"}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", border: "none", background: "#000" }}
        />
      )}

      {iframeSrc && sources.length > 1 && (
        <select
          value={iframeSrc}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="Stream source"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 10,
            background: "rgba(0,0,0,0.65)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 14,
            opacity: controlsVisible ? 1 : 0,
            pointerEvents: controlsVisible ? "auto" : "none",
            transition: "opacity 300ms ease",
          }}
        >
          {sources.map((s) => (
            <option key={s.src} value={s.src} style={{ color: "#000" }}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", color: "#fff" }}>
          Loading stream...
        </div>
      )}
    </div>
  );
}

