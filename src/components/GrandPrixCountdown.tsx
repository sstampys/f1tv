import { useEffect, useState } from "react";
import { getNextSession, calculateTimeUntilRace, type NextSession } from "../lib/f1-api";
import { Spotlight } from "@/components/ui/spotlight";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="mx-auto flex min-h-screen w-full items-center justify-center">
          <div className="flex w-full max-w-4xl flex-col items-center justify-center px-8 py-12 text-center md:px-16">
            <div className="mb-8 h-40 md:h-52 w-48 md:w-64 rounded-lg bg-gray-900" />
            <div className="mb-10 flex flex-col items-center gap-4">
              <div className="h-6 md:h-8 w-56 md:w-80 rounded bg-gray-900" />
              <div className="h-5 w-48 rounded bg-gray-900" />
            </div>
            <div className="h-px bg-gray-900 mb-10 w-full max-w-xl" />
            <div className="w-full max-w-xl">
              <div className="h-4 w-32 rounded bg-gray-900 mb-4 mx-auto" />
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <div className="h-10 md:h-12 w-12 rounded bg-gray-900" />
                    <div className="h-3 w-5 rounded bg-gray-900" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 flex-col items-center gap-3">
                  <div className="h-4 w-16 rounded bg-gray-900" />
                  <div className="h-5 w-36 rounded bg-gray-900" />
                </div>
                <div className="flex-1 flex-col items-center gap-3">
                  <div className="h-4 w-16 rounded bg-gray-900" />
                  <div className="h-5 w-32 rounded bg-gray-900" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-500 text-sm text-center">No upcoming races</div>
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
    <div className="relative min-h-screen bg-transparent overflow-hidden">
      <Spotlight size={480} className="z-10 from-zinc-200/60 via-zinc-400/30 to-zinc-600/10" />

      <div className="pointer-events-none relative z-20 mx-auto flex min-h-screen w-full items-center justify-center">
        <div className="flex w-full max-w-5xl flex-col items-center justify-center px-8 py-16 text-center md:px-20">
          {/* 2D track map */}
          {session.circuit_image && (
            <div
              role="img"
              aria-label={`${session.circuit_short_name} circuit layout`}
              className="mb-10 h-48 md:h-60 w-48 md:w-60 drop-shadow-2xl"
              style={{
                backgroundImage: "linear-gradient(180deg, #fff, #d4d4d8)",
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

          {/* Title */}
          <div className="mb-12 drop-shadow-2xl text-center">
            <h1 className="f1-font text-6xl md:text-8xl font-bold tracking-tight text-white mb-4">
              {title}
            </h1>
            <p className="f1-font text-sm text-gray-500 font-light tracking-wide">
              {subheaderText}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-900 mb-12 w-full max-w-xl mx-auto drop-shadow-lg" />

          {/* Countdown */}
          <div className="w-full max-w-xl drop-shadow-2xl text-center">
            <p className="f1-font text-sm text-gray-600 tracking-widest uppercase mb-4 font-bold">Countdown</p>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { v: countdown.days, l: "D" },
                { v: countdown.hours, l: "H" },
                { v: countdown.minutes, l: "M" },
                { v: countdown.seconds, l: "S" },
              ].map((it) => (
                <div key={it.l} className="flex flex-col items-center">
                  <span className="f1-font text-3xl md:text-4xl font-bold text-white tracking-tight">
                    {String(it.v).padStart(2, "0")}
                  </span>
                  <span className="f1-font text-sm text-gray-600 tracking-wide mt-2 font-bold">{it.l}</span>
                </div>
              ))}
            </div>

            {/* Date / Time */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 text-center">
                <p className="f1-font text-sm text-gray-600 tracking-widest uppercase mb-2 font-bold">Date</p>
                <p className="f1-font text-base text-white font-light">{formattedDate}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="f1-font text-sm text-gray-600 tracking-widest uppercase mb-2 font-bold">Time</p>
                <p className="f1-font text-base text-white font-light">{formattedTime}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}