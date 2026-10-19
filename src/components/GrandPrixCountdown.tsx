import { useEffect, useState } from "react";
import { getNextSession, calculateTimeUntilRace, type NextSession } from "../lib/f1-api";
import { AnimateCount } from "./ui/animate-count";

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

  // Fetch session data on mount and periodically refresh
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const next = await getNextSession();
        setSession(next);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching session:", error);
        setLoading(false);
      }
    };

    // Fetch immediately on mount
    fetchSession();

    // Refresh session data every hour to catch any schedule changes
    const intervalId = setInterval(fetchSession, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(intervalId);
  }, []);

  // Update countdown every second from cached session data
  useEffect(() => {
    if (!session) return;
    
    const updateCountdown = () => {
      const t = calculateTimeUntilRace(session.date_start);
      setCountdown({ 
        days: t.days, 
        hours: t.hours, 
        minutes: t.minutes, 
        seconds: t.seconds 
      });
    };

    // Initial update
    updateCountdown();
    
    // Update every second for smooth countdown
    const intervalId = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(intervalId);
  }, [session]);

  if (loading) {
    return (
      <div className="grid h-dvh w-full place-items-center overflow-hidden bg-countdown-background">
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex w-full max-w-xl flex-col items-center justify-center px-8 py-16 text-center">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <div className="h-10 md:h-12 w-12 rounded bg-countdown-skeleton" />
                  <div className="h-3 w-5 rounded bg-countdown-skeleton" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid h-dvh w-full place-items-center overflow-hidden bg-countdown-background">
        <div className="text-stream-text text-sm text-center">No upcoming races</div>
      </div>
    );
  }

  // Hide a unit when it reads 00 and every unit to its left is also hidden
  // (leading zeros). Seconds are never hidden so the timer never disappears.
  const visibleUnits = [
    { v: countdown.days, l: "D", hidden: countdown.days === 0 },
    { v: countdown.hours, l: "H", hidden: countdown.days === 0 && countdown.hours === 0 },
    { v: countdown.minutes, l: "M", hidden: countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 },
    { v: countdown.seconds, l: "S", hidden: false },
  ].filter((it) => !it.hidden);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-countdown-background">
      <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
        <div className="flex w-full max-w-xl flex-col items-center justify-center px-8 py-16 text-center">
          {/* Countdown */}
          <div className="grid grid-cols-4 gap-4" role="timer" aria-label={`${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes, ${countdown.seconds} seconds`}>
            {[
              { v: countdown.days, l: "D" },
              { v: countdown.hours, l: "H" },
              { v: countdown.minutes, l: "M" },
              { v: countdown.seconds, l: "S" },
            ].map((it) => (
              <div key={it.l} className="flex flex-col items-center">
                <AnimateCount minDigits={2} className="h-8 min-w-12 font-display text-2xl font-bold text-stream-text md:h-9 md:text-3xl">
                  {it.v}
                </AnimateCount>
                <span className="font-display text-sm text-stream-text mt-2 font-bold" aria-hidden="true">{it.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
