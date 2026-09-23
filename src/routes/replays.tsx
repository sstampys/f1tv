import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/replays")({
  head: () => ({
    meta: [
      { title: "Replays" },
      { name: "description", content: "Formula 1 session replays" },
      { property: "og:title", content: "Replays" },
      { property: "og:description", content: "Formula 1 session replays" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Replays" },
      { name: "twitter:description", content: "Formula 1 session replays" },
    ],
  }),
  component: Replays,
});

type Replay = {
  id: number;
  name: string;
  uri_name: string;
  iframe?: string;
  source_tag?: string;
  tag?: string;
  poster?: string;
  always_live: number;
  starts_at: number;
  ends_at: number;
};

function isF1(name: string) {
  return /\bf1\b|formula\s*1|grand\s*prix/.test(name.toLowerCase());
}

function extractIframeSrc(iframe?: string): string | null {
  if (!iframe) return null;
  const m = iframe.match(/src=["']([^"']+)["']/i);
  if (m) return m[1];
  if (/^https?:\/\//i.test(iframe)) return iframe;
  return null;
}

function sourceLabel(r: Replay) {
  return (r.source_tag || r.tag || "Replay").trim();
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function Replays() {
  const [replays, setReplays] = useState<Replay[] | null>(null);
  const [active, setActive] = useState<Replay | null>(null);

  useEffect(() => {
    if (active) {
      document.title = active.name;
      return;
    }
    document.title = "Replays";
  }, [active]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("https://api.ppv.st/api/streams", {
          cache: "no-store",
        });
        const data = await res.json();
        const cats: Array<{ category: string; streams?: Replay[] }> =
          data?.streams ?? [];
        const now = Math.floor(Date.now() / 1000);
        const all = cats.flatMap((c) => c.streams ?? []);
        const f1 = all.filter((s) => isF1(s.name));
        const ended = f1
          .filter(
            (s) =>
              !s.always_live &&
              s.ends_at > 0 &&
              s.ends_at <= now &&
              extractIframeSrc(s.iframe),
          )
          .sort((a, b) => b.starts_at - a.starts_at);
        if (!cancelled) setReplays(ended);
      } catch {
        if (!cancelled) setReplays([]);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (active) {
    const src = extractIframeSrc(active.iframe)!;
    return (
      <div className="relative min-h-screen overflow-hidden bg-black">
        <iframe
          key={src}
          src={src}
          title={active.name}
          className="absolute inset-0 h-full w-full border-0 bg-black"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
        <button
          onClick={() => setActive(null)}
          className="f1-font fixed left-4 top-4 z-50 text-xs font-bold tracking-[0.25em] text-white/60 transition-colors hover:text-white sm:left-6 sm:top-6"
        >
          ‹ REPLAYS
        </button>
      </div>
    );
  }

  return (
    <div className="inter-font relative min-h-screen bg-black">
      <div className="mx-auto w-full max-w-4xl px-6 pb-16 pt-16 text-center sm:pt-20">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl font-bold tracking-[0.2em] text-white sm:text-3xl">
            REPLAYS
          </h1>
          <Link
            to="/"
            className="text-xs font-bold tracking-[0.25em] text-white/50 transition-colors hover:text-white"
          >
            COUNTDOWN
          </Link>
        </div>

        {replays === null ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <div className="aspect-video w-full animate-pulse rounded-xl bg-gray-900" />
                <div className="mt-3 h-3.5 w-3/4 animate-pulse rounded bg-gray-900" />
                <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-gray-900" />
              </div>
            ))}
          </div>
        ) : replays.length === 0 ? (
          <p className="f1-font mt-16 text-center text-sm tracking-[0.2em] text-white/40">
            NO REPLAYS AVAILABLE YET
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {replays.map((r) => (
              <button
                key={r.id}
                onClick={() => setActive(r)}
                className="group text-left"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-gray-950">
                  {r.poster ? (
                    <img
                      src={r.poster}
                      alt={r.name}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <p className="f1-font mt-3 text-sm font-bold text-white">
                  {r.name}
                </p>
                <p className="f1-font mt-1 text-xs tracking-wide text-white/50">
                  {sourceLabel(r)} · {formatDate(r.starts_at)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
