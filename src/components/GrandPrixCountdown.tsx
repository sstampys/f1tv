import { useEffect, useState } from "react";
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

export function GrandPrixCountdown() {
  const [session, setSession] = useState<NextSession | null>(null);
  const [countdown, setCountdown] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

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
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0 hidden lg:block lg:left-1/2">
        {mounted && <SplineScene scene={ROBOT_SCENE} className="h-full w-full" />}
      </div>
      <Spotlight size={420} className="z-10 from-zinc-200/60 via-zinc-400/30 to-zinc-600/10" />

      <div className="pointer-events-none relative z-20 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Left content */}
        <div className="flex flex-col justify-center items-start text-left px-8 md:px-12 py-10">
          {/* 2D track map with a polished silver finish */}
          {session.circuit_image && (
            <div
              role="img"
              aria-label={`${session.circuit_short_name} circuit layout`}
              className="mb-6 h-32 w-40 md:h-40 md:w-52 drop-shadow-2xl"
              style={{
                backgroundImage: "var(--gradient-silver)",
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

          {/* Silver gradient title */}
          <div className="mb-8 drop-shadow-2xl">
            <h1
              className="f1-font text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent mb-3"
              style={{ backgroundImage: "var(--gradient-silver)" }}
            >
              {title}
            </h1>
            <p className="f1-font text-xs text-gray-500 font-light tracking-wide">
              {subheaderText}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-900 mb-8 w-full max-w-xl drop-shadow-lg" />

          {/* Countdown */}
          <div className="w-full max-w-xl drop-shadow-2xl">
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

        <div className="hidden lg:block" aria-hidden="true" />
      </div>
    </div>
  );
}
