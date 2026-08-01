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

async function fetchAllStreams(): Promise<Stream[]> {
  const res = await fetch("https://api.ppv.st/api/streams", { cache: "no-store" });
  const data = await res.json();
  const cats: Category[] = data?.streams ?? [];
  const all = cats.flatMap((c) =>
    c.streams.map((s) => ({ ...s, category_name: s.category_name || c.category })),
  );
  return all;
}

async function fetchF1Streams(): Promise<Stream[]> {
  const all = await fetchAllStreams();
  return all.filter(isF1);
}

function extractIframeSrc(iframe?: string): string | null {
  if (!iframe) return null;
  const m = iframe.match(/src=["']([^"']+)["']/i);
  if (m) return m[1];
  if (/^https?:\/\//i.test(iframe)) return iframe;
  return null;
}

function isPlayableUrl(u?: string) {
  if (!u) return false;
  return /\.(mp4|webm|ogg)(\?|$)/i.test(u) || /^data:video\//i.test(u);
}

type Source = { label: string; src: string; iframeHtml?: string };

function buildSources(streams: Stream[]): Source[] {
  const out: Source[] = [];
  const seen = new Set<string>();
  for (const s of streams) {
    const candidates: Array<{ source_tag?: string; tag?: string; iframe?: string }> = [
      { source_tag: s.source_tag, tag: s.tag, iframe: s.iframe },
      ...(s.substreams ?? []),
    ];
    for (const c of candidates) {
      const iframeHtml = c.iframe ?? undefined;
      const src = extractIframeSrc(c.iframe) ?? (c === candidates[0] ? `https://ppv.st/live/${s.uri_name}` : null);
      if (!src || seen.has(src)) continue;
      seen.add(src);
      out.push({ label: labelOf(c), src, iframeHtml });
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

// Demo: fallback mapping (used only if PPV API doesn't provide a matching 24/7 stream)
const DEMO_SOURCE_ENTRIES: Source[] = [
  { label: "Sky Sports", src: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { label: "Apple TV", src: "https://www.w3schools.com/html/movie.mp4" },
  { label: "F1 TV Pro", src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
];

// Prefer real PPV always-live streams and map one per demo label.
function pickDemoSourcesFromStreams(rawSources: Source[], rawStreams: Stream[]): Source[] {
  const targets = [
    { label: "Sky Sports", keywords: ["sky sports", "sky"] },
    { label: "Apple TV", keywords: ["apple tv", "appletv", "apple", "atv"] },
    { label: "F1 TV Pro", keywords: ["f1 tv", "f1tv", "f1", "formula"] },
  ];

  const out: Source[] = [];
  const usedStreamIds = new Set<number>();

  for (const t of targets) {
    // 1) Try to find an always_live Stream that matches keywords
    const match = rawStreams.find((st) => {
      if (!st) return false;
      if (st.always_live !== 1) return false;
      const hay = `${st.category_name ?? ""} ${st.name ?? ""} ${st.source_tag ?? ""} ${st.tag ?? ""}`.toLowerCase();
      return t.keywords.some((k) => hay.includes(k));
    });

    if (match) {
      usedStreamIds.add(match.id);
      const src = extractIframeSrc(match.iframe) ?? `https://ppv.st/live/${match.uri_name}`;
      out.push({ label: t.label, src, iframeHtml: match.iframe });
      continue;
    }

    // 2) Fallback: any unused always_live stream
    const anyLive = rawStreams.find((st) => st.always_live === 1 && !usedStreamIds.has(st.id));
    if (anyLive) {
      usedStreamIds.add(anyLive.id);
      const src = extractIframeSrc(anyLive.iframe) ?? `https://ppv.st/live/${anyLive.uri_name}`;
      out.push({ label: t.label, src, iframeHtml: anyLive.iframe });
      continue;
    }

    // 3) Fallback: match flattened source labels (prefer iframeHtml)
    const rawMatch = rawSources.find((rs) => t.keywords.some((k) => (rs.label || "").toLowerCase().includes(k)));
    if (rawMatch) {
      out.push({ label: t.label, src: rawMatch.src, iframeHtml: rawMatch.iframeHtml });
      continue;
    }

    // 4) Final fallback: local placeholder
    const placeholder = DEMO_SOURCE_ENTRIES.find((d) => d.label === t.label);
    if (placeholder) out.push(placeholder as Source);
  }

  return out;
}

function buildSrcDoc(html: string) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0;background:#000;color:#fff">${html}</body></html>`;
}

const DEMO_STREAMS_PLACEHOLDER: Stream[] = [
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
  const [streams, setStreams] = useState<Stream[]>([]); // F1 subset for main view
  const [allStreams, setAllStreams] = useState<Stream[]>([]); // full API list for demo mapping
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Demo fallback and debug states
  const [isDemoParam, setIsDemoParam] = useState(false);
  const [demoSelected, setDemoSelected] = useState<string | null>(null);
  const [lastApiOk, setLastApiOk] = useState<boolean | null>(null);

  // Immediately detect demo param so UI shows debug and uses demo flow.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const demoParam = params.get("demo");
      const on = demoParam === "1" || demoParam === "true" || demo === true;
      setIsDemoParam(on);
      if (on) {
        // show placeholder demo streams while API is fetched
        setStreams(DEMO_STREAMS_PLACEHOLDER);
        setLoading(false);
      }
    } catch (e) {
      setIsDemoParam(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const all = await fetchAllStreams();
        if (!cancelled) {
          setAllStreams(all);
          // keep the main UI scoped to F1 streams
          const f1 = all.filter(isF1);
          setStreams(f1.length ? f1 : DEMO_STREAMS_PLACEHOLDER);
          setLoading(false);
          setLastApiOk(true);
        }
      } catch (err) {
        setLoading(false);
        setLastApiOk(false);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flattened sources for the F1 subset (used for regular UI)
  const rawSources = buildSources(streams);
  // Flattened sources for the full API (used for demo mapping)
  const rawSourcesAll = buildSources(allStreams);

  // When demo param present, prefer PPV-provided 24/7 streams mapped to known labels using the full API
  const sources = isDemoParam ? pickDemoSourcesFromStreams(rawSourcesAll, allStreams) : rawSources;

  // Demo pick: if demo param present and user hasn't selected, pick the first demo source by default
  useEffect(() => {
    if (!isDemoParam) {
      setDemoSelected(null);
      return;
    }
    if (selected) return; // respect explicit user choice
    if (sources.length === 0) return;
    setDemoSelected(sources[0].src);
  }, [isDemoParam, sources, selected]);

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

  // Find the selected source object (for iframeHtml if available)
  const matchedSource = sources.find((s) => s.src === iframeSrc) ?? null;

  // Player renderer with srcDoc for provider HTML and Open button fallback
  const renderPlayer = () => {
    if (!iframeSrc) return null;

    if (matchedSource?.iframeHtml) {
      const srcdoc = buildSrcDoc(matchedSource.iframeHtml);
      return (
        <div key={iframeSrc} style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", zIndex: 1, background: "#000" }}>
          <iframe
            title={allStreams[0]?.name ?? streams[0]?.name ?? "F1 Live"}
            srcDoc={srcdoc}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
            style={{ width: "100%", height: "100%", border: "none", background: "#000" }}
          />
          <div style={{ position: "absolute", right: 12, top: 12, zIndex: 100001 }}>
            <button
              onClick={() => window.open(matchedSource.src, "_blank")}
              style={{ background: "rgba(0,0,0,0.6)", color: "#fff", padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)" }}
              aria-label="Open player in new tab"
              title="Open player in new tab"
            >
              Open
            </button>
          </div>
        </div>
      );
    }

    if (isPlayableUrl(iframeSrc)) {
      return (
        <video
          key={iframeSrc}
          src={iframeSrc}
          title={allStreams[0]?.name ?? streams[0]?.name ?? "F1 Live (demo)"}
          autoPlay
          muted
          playsInline
          controls
          style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", objectFit: "cover", zIndex: 1, background: "#000" }}
        />
      );
    }

    return (
      <iframe
        key={iframeSrc}
        src={iframeSrc}
        title={allStreams[0]?.name ?? streams[0]?.name ?? "F1 Live"}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
        allowFullScreen
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100dvh", border: "none", background: "#000", zIndex: 1 }}
      />
    );
  };

  return (
    <div style={{ backgroundColor: "#000", minHeight: "100dvh", width: "100%", margin: 0, padding: 0, overflowY: "auto" }}>
      {/* Show countdown inside the dynamic wrapper when no stream is available */}
      {!loading && !iframeSrc && <GrandPrixCountdown />}

      {renderPlayer()}

      {/* Source switcher: positioned above the player */}
      {iframeSrc && sources.length > 1 && (
        <div style={{ position: "fixed", top: 12, right: 12, zIndex: 100000 }}>
          <select
            value={iframeSrc}
            onChange={(e) => {
              setSelected(e.target.value);
              // clear demoSelected so user selection persists
              setDemoSelected(null);
            }}
            aria-label="Stream source"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 14,
              WebkitAppearance: "none",
            }}
          >
            {sources.map((s) => (
              <option key={s.src} value={s.src} style={{ color: "#000" }}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", color: "#fff" }}>
          Loading stream...
        </div>
      )}

      {/* Demo debug overlay (visible only when ?demo=true) */}
      {isDemoParam && (
        <div style={{
          position: "fixed",
          left: 12,
          bottom: 12,
          zIndex: 100000,
          padding: 8,
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          fontSize: 12,
          borderRadius: 6,
        }}>
          <div>demo={String(isDemoParam)}</div>
          <div>sources={sources.length}</div>
          <div style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>src={iframeSrc ?? "none"}</div>
          <div>ppv api: {lastApiOk === null ? "?" : lastApiOk ? "ok" : "fail"}</div>

          {/* Temporary debug dump: show first few raw streams and flattened sources so we can see what the API returned */}
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.95 }}>
            <div style={{ fontWeight: 600, marginTop: 6 }}>rawStreams (first 6):</div>
            {allStreams.slice(0, 6).map((st) => (
              <div key={st.id} style={{ lineHeight: 1.2 }}>{st.id} | {st.name} | uri:{st.uri_name} | live:{st.always_live} | tag:{st.source_tag}</div>
            ))}
            <div style={{ fontWeight: 600, marginTop: 6 }}>rawSources (first 8):</div>
            {rawSourcesAll.slice(0, 8).map((rs) => (
              <div key={rs.src} style={{ lineHeight: 1.2 }}>{rs.label} → {rs.src}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
