import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GrandPrixCountdown } from "../components/GrandPrixCountdown";

export const Route = createFileRoute("/")({
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

function isAppleTv(x: { source_tag?: string; tag?: string }) {
  const hay = `${x.source_tag ?? ""} ${x.tag ?? ""}`.toLowerCase();
  return /apple\s*tv|appletv|\batv\b/.test(hay);
}

async function fetchF1Stream(): Promise<Stream | null> {
  const res = await fetch("https://api.ppv.st/api/streams", { cache: "no-store" });
  const data = await res.json();
  const cats: Category[] = data?.streams ?? [];
  const now = Math.floor(Date.now() / 1000);
  const all = cats.flatMap((c) =>
    c.streams.map((s) => ({ ...s, category_name: s.category_name || c.category })),
  );
  const f1 = all.filter(isF1);
  const live = f1.find((s) => s.always_live === 1 || (s.starts_at <= now && s.ends_at >= now));
  return live ?? f1[0] ?? null;
}

function extractIframeSrc(iframe?: string): string | null {
  if (!iframe) return null;
  const m = iframe.match(/src=["']([^"']+)["']/i);
  if (m) return m[1];
  if (/^https?:\/\//i.test(iframe)) return iframe;
  return null;
}

function resolveIframeSrc(stream: Stream | null): string | null {
  if (!stream) return null;
  const candidates: Array<{ source_tag?: string; tag?: string; iframe?: string }> = [
    { source_tag: stream.source_tag, tag: stream.tag, iframe: stream.iframe },
    ...(stream.substreams ?? []),
  ];
  const apple = candidates.find((c) => isAppleTv(c) && c.iframe);
  const chosen = apple ?? candidates.find((c) => c.iframe);
  return (
    extractIframeSrc(chosen?.iframe) ??
    `https://ppv.st/live/${stream.uri_name}`
  );
}

function Index() {
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await fetchF1Stream();
        if (!cancelled) {
          setStream((prev) => (prev && s && prev.id === s.id ? prev : s));
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

  const iframeSrc = resolveIframeSrc(stream);

  // Show countdown when no stream is available
  if (!loading && !iframeSrc) {
    return <GrandPrixCountdown />;
  }

  return (
    <div style={{ backgroundColor: "#000", minHeight: "100vh", width: "100%", margin: 0, padding: 0 }}>
      {iframeSrc && (
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={stream?.name ?? "F1 Live"}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none", background: "#000" }}
        />
      )}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "#fff" }}>
          Loading stream...
        </div>
      )}
    </div>
  );
}
