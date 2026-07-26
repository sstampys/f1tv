import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "F1 Live" },
      { name: "description", content: "Live Formula 1 stream, auto-updating." },
      { property: "og:title", content: "F1 Live" },
      { property: "og:description", content: "Live Formula 1 stream, auto-updating." },
    ],
  }),
  component: Index,
});

type Stream = {
  id: number;
  name: string;
  uri_name: string;
  iframe?: string;
  category_name: string;
  always_live: number;
  starts_at: number;
  ends_at: number;
};

type Category = {
  category: string;
  streams: Stream[];
};

async function fetchF1Stream(): Promise<Stream | null> {
  const res = await fetch("https://api.ppv.st/api/streams", { cache: "no-store" });
  const data = await res.json();
  const cats: Category[] = data?.streams ?? [];
  const now = Math.floor(Date.now() / 1000);
  const all = cats.flatMap((c) => c.streams.map((s) => ({ ...s, category_name: s.category_name || c.category })));
  const f1 = all.filter((s) => /formula\s*1|f1/i.test(`${s.category_name} ${s.name}`));
  const live = f1.find((s) => s.always_live === 1 || (s.starts_at <= now && s.ends_at >= now));
  return live ?? f1[0] ?? null;
}

function Index() {
  const [stream, setStream] = useState<Stream | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await fetchF1Stream();
        if (!cancelled) {
          setStream((prev) => (prev && s && prev.id === s.id ? prev : s));
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const iframeSrc = stream ? `https://ppv.st/live/${stream.uri_name}` : null;

  return (
    <div style={{ backgroundColor: "#000", minHeight: "100vh", width: "100%", margin: 0, padding: 0 }}>
      {iframeSrc ? (
        <iframe
          key={iframeSrc}
          src={iframeSrc}
          title={stream?.name ?? "F1 Live"}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none", background: "#000" }}
        />
      ) : (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#111",
            fontFamily: "system-ui, sans-serif",
            fontSize: 12,
          }}
        >
          {loaded ? "" : ""}
        </div>
      )}
    </div>
  );
}
