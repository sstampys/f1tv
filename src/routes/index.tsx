import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GrandPrixCountdown } from "../components/GrandPrixCountdown";
import { LiquidGlassButton } from "../components/ui/apple-tahoe-liquid-glass-button";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { demo?: "sample" | "ppv" } => {
    const raw = String(search.demo ?? "").toLowerCase();
    if (raw === "ppv") return { demo: "ppv" };
    if (raw === "1" || raw === "true" || raw === "sample") return { demo: "sample" };
    return {};
  },
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
    if (demo === "sample") {
      setStreams(makeDemoStream(DEMO_SAMPLE_SRCS));
      setLoading(false);
      return;
    }
    if (demo === "ppv") {
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
    const events = [
      "pointermove",
      "pointerdown",
      "mousemove",
      "touchstart",
      "touchmove",
      "click",
      "keydown",
      "scroll",
    ] as const;
    show();
    // Capture phase so events inside the video element still reach us.
    events.forEach((e) => document.addEventListener(e, show, { capture: true, passive: true }));
    window.addEventListener("focus", show);
    return () => {
      clearTimeout(timer);
      events.forEach((e) => document.removeEventListener(e, show, { capture: true }));
      window.removeEventListener("focus", show);
      const gl = glRef.current;
      if (gl) {
        if (glTexRef.current.bg) gl.deleteTexture(glTexRef.current.bg);
        if (glTexRef.current.disp) gl.deleteTexture(glTexRef.current.disp);
        if (glProgRef.current) gl.deleteProgram(glProgRef.current);
      }
    };
  }, [iframeSrc]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      {!loading && !iframeSrc ? (
        <GrandPrixCountdown />
      ) : loading ? (
        <div className="text-white text-center">Loading...</div>
      ) : (
        <>
          {/* Video container */}
          <div className="relative w-full max-w-4xl mx-auto">
            {/* Video iframe */}
            <iframe
              className="w-full h-[500px] md:h-[600px] rounded-lg"
              title="F1 Live Stream"
              src={iframeSrc}
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              frameBorder="0"
            />

            {/* Source switcher */}
            {sources.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
                {sources.map((source) => (
                  <LiquidGlassButton
                    key={source.src}
                    onClick={() => setSelected(source.src)}
                    className="px-4 py-2 text-sm font-medium"
                  >
                    {source.label}
                  </LiquidGlassButton>
                ))}
              </div>
            )
            }

            {/* Video title */}
            {selected && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium bg-black/60 px-3 py-1 rounded-full z-20">
                {sources.find(s => s.src === selected)?.label || "Live Stream"}
              </div>
            )
            }
          </>
        )
    </div>
    </div>
  );
