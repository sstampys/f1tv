import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getNextSession, calculateTimeUntilRace, type NextSession } from "../lib/f1-api";
import { Starfield } from "./ui/starfield";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function GrandPrixCountdown() {
  const reducedMotion = useReducedMotion();
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

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-countdown-background">
      {/* Animated starfield background */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Starfield starCount={12000} />
      </div>
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
                <span className="relative block h-8 min-w-12 overflow-hidden font-display text-2xl font-bold tabular-nums text-stream-text md:h-9 md:text-3xl" aria-hidden="true">
                  <AnimatePresence initial={false}>
                    <motion.span
                      key={it.v}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={reducedMotion ? false : { y: "65%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={reducedMotion ? { opacity: 0 } : { y: "-65%", opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {String(it.v).padStart(2, "0")}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <span className="font-display text-sm text-stream-text mt-2 font-bold" aria-hidden="true">{it.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
