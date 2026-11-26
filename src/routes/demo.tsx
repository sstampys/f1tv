import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { LiquidGlassButton } from "@/components/ui/apple-tahoe-liquid-glass-button";
import { getSourceLanguage, type SourceLanguage } from "@/lib/source-language";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/demo")({
  validateSearch: (search: Record<string, unknown>): { demo?: "sample" | "ppv" } => {
    const raw = String(search.demo ?? "").toLowerCase();
    if (raw === "ppv") return { demo: "ppv" };
    if (raw === "1" || raw === "true" || raw === "sample") return { demo: "sample" };
    return {};
  },
  head: () => ({
    meta: [
      { title: "Demo — F1 Stream" },
      { name: "description", content: "Demo of F1 stream functionality" },
      { property: "og:title", content: "Demo — F1 Stream" },
      { property: "og:description", content: "Demo of F1 stream functionality" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

function DemoRoute() {
  const { demo } = Route.useSearch();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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
    document.title = iframeSrc ? "Stream Demo" : "Demo";
  }, [iframeSrc]);

  useEffect(() => {
    if (!iframeSrc) return;
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
  }, [iframeSrc]);

  return (
    <div className="min-h-screen bg-ground">

      
      <main className="editorial-page">
        <header className="">
          <h1 className="text-ink ">Demo Stream</h1>
          <p className="lead-text mt-2">Test the stream player with sample content</p>
        </header>

        {!loading && !iframeSrc ? (
          <div className="flex items-center justify-center min-h-[40vh] bg-ground">
            <div className="text-ink-2 text-sm text-center">Demo Stream Loading...</div>
          </div>
        ) : null}

        {iframeSrc ? (
          <div className="stream-player">
            <video
              key={iframeSrc}
              className="absolute inset-0 w-full h-full object-contain"
              src={iframeSrc}
              autoPlay
              controls
              playsInline
            />

            {iframeSrc && sources.length > 1 ? (
              <>
                <div
                  className="fixed right-0 top-0 z-40 h-24 w-56"
                  aria-hidden="true"
                  onPointerMove={() => setControlsVisible(true)}
                  onPointerDown={() => setControlsVisible(true)}
                  onTouchStart={() => setControlsVisible(true)}
                />
                <div
                  className={`player-controls absolute right-4 bottom-4 z-40 transition-all duration-300 ${
                    controlsVisible || menuOpen
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-2 opacity-0"
                  }`}
                >
                  <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <LiquidGlassButton aria-label="Change stream source">
                        <span className="max-w-36 truncate">{currentSource?.label ?? "Sources"}</span>
                        <ChevronDown className="size-4 opacity-80 transition-transform group-data-[state=open]:rotate-180" />
                      </LiquidGlassButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      sideOffset={8}
                      className="source-menu w-80 max-w-[calc(100vw-2rem)] p-1.5"
                    >
                      {sources.map((source) => (
                        <DropdownMenuItem
                          key={source.src}
                          onSelect={() => setSelected(source.src)}
                          className="source-item cursor-pointer gap-3 px-3 py-2.5 text-sm focus:bg-stream-hover focus:text-stream-text"
                        >
                          <span className="flex-1 truncate">{source.label}</span>
                          {source.language ? (
                            <span className="flex shrink-0 items-center gap-2">
                              <span aria-hidden="true">{source.language.flag}</span>
                              <span className="opacity-75">{source.language.name}</span>
                            </span>
                          ) : null}
                          <span className="flex size-4 shrink-0 items-center justify-center">
                            {source.src === iframeSrc ? <Check className="size-4" /> : null}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
