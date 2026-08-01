import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GrandPrixCountdown } from "../components/GrandPrixCountdown";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    demo: search.demo === "1" || search.demo === 1 || search.demo === true,
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
  const hay = `${s.category_name} ${s.name}`.toLowerCase();
  return /\bf1\b|formula\s*1|grand\s*prix|motorsport/.test(hay);
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
  const live = f1.filter((s) => s.always_live === 1 || (s.starts_at <= now && s.ends_at >= now));
  const picked = live.length ? live : f1.length ? [f1[0]] : [];
  return picked;
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

const DEMO_STREAMS: Stream[] = [
  {
    id: -1,
    name: "Demo Grand Prix",
    uri_name: "demo/grand-prix",
    category_name: "Motorsports",
    always_live: 1,
    starts_at: 0,
    ends_at: 0,
    source_tag: "Sky Sports",
    tag: "Motorsports",
    iframe: "https://www.w3schools.com/html/mov_bbb.mp4",
    substreams: [
      { source_tag: "Apple TV", tag: "Motorsports", iframe: "https://www.w3schools.com/html/movie.mp4" },
      { source_tag: "F1 TV Pro", tag: "Motorsports", iframe: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
    ],
  },
];

function Index() {
  const { demo } = Route.useSearch();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Always fetch real streams; do not substitute DEMO_STREAMS based on route search.
  useEffect(() => {
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
  }, []);

  const sources = buildSources(streams);

  // New: preview-host demo behavior (client-side only)
  const [demoSelected, setDemoSelected] = useState<string | null>(null);
  const [isDemoHost, setIsDemoHost] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const demoParam = params.get("demo");
      // Enable demo when the demo query param is present and truthy (1/true).
      if (demoParam === "1" || demoParam === "true") {
        setIsDemoHost(true);
      } else {
        setIsDemoHost(false);
      }
    } catch (e) {
      setIsDemoHost(false);
    }
  }, []);

  // When demo is enabled, pick a random source when the sources list updates — but do not override an explicit user selection.
  useEffect(() => {
    if (!isDemoHost) {
      setDemoSelected(null);
      return;
    }
    if (selected) return;
    if (sources.length === 0) return;
    const idx = Math.floor(Math.random() * sources.length);
    setDemoSelected(sources[idx].src);
  }, [isDemoHost, sources, selected]);

  const iframeSrc = selected ?? demoSelected ?? (sources[0]?.src ?? null);


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
          onChange={(e) => {
            setSelected(e.target.value);
            // clear demoSelected so user selection persists
            setDemoSelected(null);
          }}
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
