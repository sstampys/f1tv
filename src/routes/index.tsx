import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { GrandPrixCountdown } from "../components/GrandPrixCountdown";
import { getSourceLanguage, type SourceLanguage } from "@/lib/source-language";
import { setStreamPlaying } from "@/lib/stream-status";

// Stream page body is loaded on demand, so the countdown page never ships the
// player, the source dropdown or their UI dependencies.
const StreamView = lazy(() => import("@/components/StreamView"));

type Substream = {
  locale?: string | null;
  source_tag?: string;
  tag?: string;
  iframe?: string;
};

type Stream = {
  locale?: string | null;
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

type Source = { label: string; src: string; language: SourceLanguage | null };

function buildSources(streams: Stream[]): Source[] {
  const out: Source[] = [];
  const seen = new Set<string>();
  for (const s of streams) {
    const candidates: Substream[] = [
      { source_tag: s.source_tag, tag: s.tag, iframe: s.iframe, locale: s.locale },
      ...(s.substreams ?? []),
    ];
    for (const c of candidates) {
      const src = extractIframeSrc(c.iframe) ?? (c === candidates[0] ? `https://ppv.st/live/${s.uri_name}` : null);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      const label = labelOf(c);
      out.push({ label, src, language: getSourceLanguage(label, src, c.locale) });
    }
  }
  return out.sort((a, b) => rank(a) - rank(b));
}

function rank(s: Source) {
  if (isSkySports({ source_tag: s.label })) return 0;
  if (isAppleTv({ source_tag: s.label })) return 1;
  return 2;
}

const DEMO_LABELS = ["Sky Sports", "Apple TV", "F1 TV Pro"];
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

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { demo?: "sample" | "ppv" } => {
    const raw = String(search.demo ?? "").toLowerCase();
    if (raw === "ppv") return { demo: "ppv" };
    if (raw === "1" || raw === "true" || raw === "sample") return { demo: "sample" };
    return {};
  },
  head: () => ({
    meta: [
      { title: "Countdown" },
      { name: "description", content: "Live Formula 1 countdown to next race with stream embed when live." },
      { property: "og:title", content: "F1Box — Live F1 Countdown & Streams" },
      { property: "og:description", content: "Live Formula 1 countdown to next race with stream embed when live." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.f1box.org/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://www.f1box.org/" },
    ],
  }),
  component: Index,
});

function Index() {
  const { demo } = Route.useSearch();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamLoaded, setStreamLoaded] = useState(false);

  // Fetch streams
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
      return () => { cancelled = true; };
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
    return () => { cancelled = true; clearInterval(id); };
  }, [demo]);

  const sources = buildSources(streams);
  const iframeSrc = selected && sources.some((s) => s.src === selected) ? selected : (sources[0]?.src ?? null);
  const currentSource = sources.find((source) => source.src === iframeSrc);
  const hasStream = !!iframeSrc;

  useEffect(() => {
    setStreamPlaying(hasStream);
    return () => setStreamPlaying(false);
  }, [hasStream]);

  // Auto-hide controls for embedded stream
  useEffect(() => {
    if (!hasStream) return;
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      setControlsVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setControlsVisible(false), 3000);
    };
    const events = [
      "pointermove", "pointerdown", "mousemove", "touchstart", "touchmove", "click", "keydown", "scroll",
    ] as const;
    show();
    events.forEach((e) => document.addEventListener(e, show, { capture: true, passive: true }));
    window.addEventListener("focus", show);
    return () => {
      clearTimeout(timer);
      events.forEach((e) => document.removeEventListener(e, show, { capture: true }));
      window.removeEventListener("focus", show);
    };
  }, [hasStream]);

  const handleIframeLoad = () => setStreamLoaded(true);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  return (
    <div className="min-h-screen bg-ground">
      {!hasStream ? (
        <div className="page page--center">
          <GrandPrixCountdown />
        </div>
      ) : (
        // Stream page — lazily loaded so the countdown page never ships it.
        <Suspense fallback={null}>
          <StreamView
            demo={demo}
            sources={sources}
            iframeSrc={iframeSrc}
            currentSource={currentSource}
            hasStream={hasStream}
            streamLoaded={streamLoaded}
            controlsVisible={controlsVisible}
            menuOpen={menuOpen}
            isFullscreen={isFullscreen}
            setMenuOpen={setMenuOpen}
            setSelected={setSelected}
            setStreamLoaded={setStreamLoaded}
            setIsFullscreen={setIsFullscreen}
            handleIframeLoad={handleIframeLoad}
            toggleFullscreen={toggleFullscreen}
          />
        </Suspense>
      )}
    </div>
  );
}