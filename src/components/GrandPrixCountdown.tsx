import { useEffect, useRef, useState } from "react";
import { getNextSession, calculateTimeUntilRace, type NextSession } from "../lib/f1-api";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";

const ROBOT_SCENE = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function extractFlagColors(img: HTMLImageElement): string[] {
  const canvas = document.createElement("canvas");
  const w = (canvas.width = 32);
  const h = (canvas.height = 20);
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  try {
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 200) continue;
      const max = Math.max(r, g, b);
      if (max < 30) continue; // skip near-black

      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const prev = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      prev.r += r; prev.g += g; prev.b += b; prev.n += 1;
      buckets.set(key, prev);
    }
    const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 3);
    return sorted.map((c) => `rgb(${Math.round(c.r / c.n)}, ${Math.round(c.g / c.n)}, ${Math.round(c.b / c.n)})`);
  } catch {
    return [];
  }
}

export function GrandPrixCountdown() {
  const [session, setSession] = useState<NextSession | null>(null);
  const [countdown, setCountdown] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [gradient, setGradient] = useState<string>("linear-gradient(to right, #60a5fa, #a855f7, #ec4899)");
  const flagRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const next = await getNextSession();
      setSession(next);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!session) return;
    const update = () => {
      const t = calculateTimeUntilRace(session.date_start);
      setCountdown({ days: t.days, hours: t.hours, minutes: t.minutes, seconds: t.seconds });
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [session]);

  const handleFlagLoad = () => {
    if (!flagRef.current) return;
    const colors = extractFlagColors(flagRef.current);
    if (colors.length >= 2) {
      setGradient(`linear-gradient(to right, ${colors.join(", ")})`);
    } else if (colors.length === 1) {
      setGradient(`linear-gradient(to right, ${colors[0]}, ${colors[0]})`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black animate-pulse">
        <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-2">
          <div className="flex flex-col justify-center items-start px-8 md:px-12 py-10">
            <div className="mb-6 h-32 w-40 md:h-40 md:w-52 rounded-lg bg-gray-900" />
            <div className="mb-8 flex flex-col items-start gap-3">
              <div className="h-12 md:h-16 w-64 md:w-96 rounded bg-gray-900" />
              <div className="h-4 w-40 rounded bg-gray-900" />
            </div>
            <div className="h-px bg-gray-900 mb-8 w-full max-w-xl" />
            <div className="w-full max-w-xl">
              <div className="h-3 w-24 rounded bg-gray-900 mb-3" />
              <div className="grid grid-cols-4 gap-2 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-start gap-2">
                    <div className="h-8 md:h-10 w-10 rounded bg-gray-900" />
                    <div className="h-3 w-4 rounded bg-gray-900" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex flex-col items-start gap-2">
                  <div className="h-3 w-12 rounded bg-gray-900" />
                  <div className="h-4 w-28 rounded bg-gray-900" />
                </div>
                <div className="flex-1 flex flex-col items-start gap-2">
                  <div className="h-3 w-12 rounded bg-gray-900" />
                  <div className="h-4 w-24 rounded bg-gray-900" />
                </div>
              </div>
            </div>
          </div>
          <div className="hidden lg:block" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-500 text-sm">No upcoming races</div>
      </div>
    );
  }

  const raceDate = new Date(session.date_start);
  const formattedDate = raceDate.toLocaleDateString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
  const formattedTime = raceDate.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  const gpName = (session.meeting_name ?? "")
    .replace(/\s*grand\s*prix\s*/i, "")
    .trim();
  const title = `${gpName || session.country_name} ${session.session_name}`;
  const subheaderText = `${session.circuit_short_name} Circuit`;

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <Spotlight size={420} className="from-zinc-200/60 via-zinc-400/30 to-zinc-600/10" />

      {/* Hidden flag — used only to derive the title gradient colors */}
      {session.country_flag && (
        <img
          ref={flagRef}
          src={session.country_flag}
          alt=""
          aria-hidden="true"
          crossOrigin="anonymous"
          onLoad={handleFlagLoad}
          className="absolute opacity-0 pointer-events-none w-px h-px"
        />
      )}

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Left content */}
        <div className="flex flex-col justify-center items-start text-left px-8 md:px-12 py-10">
          {/* 2D track map, colored with the host country's flag palette */}
          {session.circuit_image && (
            <div
              role="img"
              aria-label={`${session.circuit_short_name} circuit layout`}
              className="mb-6 h-32 w-40 md:h-40 md:w-52"
              style={{
                backgroundImage: gradient,
                WebkitMaskImage: `url("${session.circuit_image}")`,
                maskImage: `url("${session.circuit_image}")`,
                WebkitMaskPosition: "center",
                maskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
              }}
            />
          )}

          {/* Gradient Title */}
          <div className="mb-8">
            <h1
              className="f1-font text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent mb-3"
              style={{ backgroundImage: gradient }}
            >
              {title}
            </h1>
            <p className="f1-font text-xs text-gray-500 font-light tracking-wide">
              {subheaderText}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-900 mb-8 w-full max-w-xl" />

          {/* Countdown */}
          <div className="w-full max-w-xl">
            <p className="f1-font text-xs text-gray-600 tracking-widest uppercase mb-3 font-bold">Countdown</p>
            <div className="grid grid-cols-4 gap-2 mb-8">
              {[
                { v: countdown.days, l: "D" },
                { v: countdown.hours, l: "H" },
                { v: countdown.minutes, l: "M" },
                { v: countdown.seconds, l: "S" },
              ].map((it) => (
                <div key={it.l} className="flex flex-col items-start">
                  <span className="f1-font text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {String(it.v).padStart(2, "0")}
                  </span>
                  <span className="f1-font text-xs text-gray-600 tracking-wide mt-1 font-bold">{it.l}</span>
                </div>
              ))}
            </div>

            {/* Date / Time */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <p className="f1-font text-xs text-gray-600 tracking-widest uppercase mb-2 font-bold">Date</p>
                <p className="f1-font text-sm text-white font-light">{formattedDate}</p>
              </div>
              <div className="flex-1">
                <p className="f1-font text-xs text-gray-600 tracking-widest uppercase mb-2 font-bold">Time</p>
                <p className="f1-font text-sm text-white font-light">{formattedTime}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right content — interactive 3D scene */}
        <div className="relative hidden lg:block">
          {mounted && <SplineScene scene={ROBOT_SCENE} className="absolute inset-0 h-full w-full" />}
        </div>
      </div>
    </div>
  );
}
