import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { LiquidGlassButton } from "@/components/ui/apple-tahoe-liquid-glass-button";
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


function DemoRoute() {
  const { demo } = Route.useSearch();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Auto-enable demo mode for the demo page
    const demoMode = demo || "sample"; // Default to sample if not specified
    
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
      return () => {
        cancelled = true;
      };
    }
    // Default to sample demo
    setStreams(makeDemoStream(DEMO_SAMPLE_SRCS));
    setLoading(false);
  }, [demo]);

  const sources = buildSources(streams);
  const iframeSrc = selected && sources.some((s) => s.src === selected) ? selected : (sources[0]?.src ?? null);
  const currentSource = sources.find((source) => source.src === iframeSrc);

  useEffect(() => {
    document.title = iframeSrc ? "Stream Demo" : "Demo";
  }, [iframeSrc]);


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
    };
  }, [iframeSrc]);


  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {!loading && !iframeSrc ? (
        // Fallback to Starfield if no streams (shouldn't happen in demo mode)
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="text-white text-sm text-center">Demo Stream Loading...</div>
        </div>
      ) : loading ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-9 w-32 animate-pulse rounded-full bg-white/10" />
        </div>
      ) : null}

      {iframeSrc ? (
        demo === "sample" || demo === "ppv" ? (
          <video
            key={iframeSrc}
            className="absolute inset-0 h-full w-full bg-black object-contain"
            src={iframeSrc}
            autoPlay
            controls
            playsInline
          />
        ) : (
          <video
            key={iframeSrc}
            className="absolute inset-0 h-full w-full bg-black object-contain"
            src={iframeSrc}
            autoPlay
            controls
            playsInline
          />
        )
      ) : null}

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
            className={`fixed right-4 top-4 z-50 transition-all duration-300 sm:right-6 sm:top-6 ${
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
                className="min-w-48 rounded-2xl border-white/25 bg-black/45 p-1.5 text-white shadow-2xl backdrop-blur-xl backdrop-saturate-150"
              >
                {sources.map((source) => (
                  <DropdownMenuItem
                    key={source.src}
                    onSelect={() => setSelected(source.src)}
                    className="cursor-pointer rounded-xl px-3 py-2.5 text-sm focus:bg-white/15 focus:text-white"
                  >
                    <span className="flex-1 truncate">{source.label}</span>
                    {source.src === iframeSrc ? <Check className="size-4" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      ) : null}
    </div>
  );
}
