import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { LiquidGlassButton } from "@/components/ui/apple-tahoe-liquid-glass-button";
import { getSourceLanguage, type SourceLanguage } from "@/lib/source-language";
import { setStreamPlaying } from "@/lib/stream-status";
import { request } from "@/lib/data/client";
import { ENDPOINTS, KEYS } from "@/lib/data/config";
import { SystemSelect } from "@/components/ui/system-select";
import { LoadingSpinner } from "@/components/ui/loader-circle-icon";

export const Route = createFileRoute("/demo")({
  validateSearch: (search: Record<string, unknown>): { demo?: "sample" | "ppv" } => {
    const raw = String(search.demo ?? "").toLowerCase();
    if (raw === "ppv") return { demo: "ppv" };
    if (raw === "1" || raw === "true" || raw === "sample") return { demo: "sample" };
    return {};
  },
  head: () => ({
    meta: [
      { title: "Demo" },
      { name: "description", content: "Demo of F1 stream functionality" },
      { property: "og:title", content: "Demo — F1 Stream" },
      { property: "og:description", content: "Demo of F1 stream functionality" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.f1box.org/demo" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "canonical", href: "https://www.f1box.org/demo" },
    ],
  }),
  component: DemoRoute,
});

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
  const data = await request<{ streams?: Category[] }>(KEYS.streams, ENDPOINTS.streams);
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
  const data = await request<{ streams?: Category[] }>(KEYS.streams, ENDPOINTS.streams);
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

function DemoRoute() {
  const { demo } = Route.useSearch();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const demoMode = demo || "sample";
    if (demoMode === "sample") {
      setStreams(makeDemoStream(DEMO_SAMPLE_SRCS));
      setLoading(false);
      return;
    }
    if (demoMode === "ppv") {
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
    setStreams(makeDemoStream(DEMO_SAMPLE_SRCS));
    setLoading(false);
  }, [demo]);

  const sources = buildSources(streams);
  const iframeSrc = selected && sources.some((s) => s.src === selected) ? selected : (sources[0]?.src ?? null);
  const currentSource = sources.find((source) => source.src === iframeSrc);

  useEffect(() => {
    setStreamPlaying(!!iframeSrc);
    return () => setStreamPlaying(false);
  }, [iframeSrc]);

  const sourceOptions = useMemo(
    () => sources.map((source) => ({
      value: source.src,
      label: source.language?.code ? `${source.label} (${source.language.code})` : source.label,
    })),
    [sources]
  );

  return (
    <div className="min-h-screen bg-ground">
      <section className="page page--center page--center--below-pill rows">
        <div className="page-container facts">
          <h1 className="statement" data-reveal>Demo Stream</h1>
          <p className="mute" data-reveal>Test the stream player with sample content</p>
        </div>

        <div className="page-container">
          {!loading && !iframeSrc ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', background: 'var(--ground)' }}>
              <div className="mute">
                <LoadingSpinner size={14} />
              </div>
            </div>
          ) : null}

          {iframeSrc ? (
            <div className="stream-player" data-reveal>
              {demo === "ppv" ? (
                <iframe
                  key={iframeSrc}
                  src={iframeSrc}
                  title={currentSource?.label ?? "Demo stream"}
                  className="absolute inset-0 w-full h-full border-0 bg-player"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <video
                  key={iframeSrc}
                  className="absolute inset-0 w-full h-full object-contain"
                  src={iframeSrc}
                  autoPlay
                  controls
                  playsInline
                />
              )}
            </div>
          ) : null}
        </div>

        {iframeSrc && sources.length > 1 ? (
          <div className="page-container player-controls player-controls--outside justify-end">
            <SystemSelect
              value={iframeSrc ?? ""}
              options={sourceOptions}
              onChange={setSelected}
              ariaLabel="Change stream source"
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}