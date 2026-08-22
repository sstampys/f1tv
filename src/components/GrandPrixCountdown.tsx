import { useEffect, useRef, useState } from "react";
import { getNextSession, calculateTimeUntilRace, type NextSession } from "../lib/f1-api";

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
  const [gradient, setGradient] = useState<string>("linear-gradient(to right, #60a5fa, #a855f7, #ec4899)");
  const flagRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
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
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-500 text-sm tracking-wide">Loading</div>
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4 py-6">

      <div className="w-full max-w-6xl flex flex-col items-center text-center">
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

        {/* 2D track map, colored with the host country's flag palette */}
        {session.circuit_image && (
          <div
            role="img"
            aria-label={`${session.circuit_short_name} circuit layout`}
            className="mb-6 h-32 w-40 md:h-44 md:w-56"
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
          <p className="f1-font text-xs text-gray-500 font-light tracking-wide line-clamp-2">
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
              <div key={it.l} className="flex flex-col items-center">
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
    </div>
  );
}
