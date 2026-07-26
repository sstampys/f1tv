import { useEffect, useState } from "react";
import { getNextGrandPrix, calculateTimeUntilRace, type Meeting } from "../lib/f1-api";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function GrandPrixCountdown() {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [countdown, setCountdown] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeeting = async () => {
      const nextRace = await getNextGrandPrix();
      setMeeting(nextRace);
      setLoading(false);
    };

    fetchMeeting();
  }, []);

  useEffect(() => {
    if (!meeting) return;

    const updateCountdown = () => {
      const time = calculateTimeUntilRace(meeting.date_start);
      setCountdown({
        days: time.days,
        hours: time.hours,
        minutes: time.minutes,
        seconds: time.seconds,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [meeting]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-500 text-sm tracking-wide">Loading</div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-500 text-sm">No upcoming races</div>
      </div>
    );
  }

  const raceDate = new Date(meeting.date_start);
  const formattedDate = raceDate.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedTime = raceDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const raceYear = raceDate.getFullYear();
  const subheaderText = `FORMULA 1 ${raceYear} ${meeting.circuit_short_name}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4 py-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Formula1:wght@400;700&display=swap');
        
        .f1-font {
          font-family: 'Formula1', sans-serif;
        }
      `}</style>

      <div className="w-full max-w-6xl">
        {/* Top - Small Flag */}
        {meeting.country_flag && (
          <div className="mb-6 flex justify-center md:justify-start">
            <img
              src={meeting.country_flag}
              alt={meeting.country_name}
              className="w-32 h-20 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Gradient Title */}
        <div className="mb-8">
          <h1 className="f1-font text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-3">
            {meeting.meeting_name}
          </h1>

          {/* Official Name / Subheader */}
          <p className="f1-font text-xs text-gray-500 font-light tracking-wide line-clamp-2">
            {subheaderText}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-900 mb-8" />

        {/* Main Content - Left to Right */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Countdown Section */}
          <div className="md:col-span-2">
            <p className="f1-font text-xs text-gray-600 tracking-widest uppercase mb-3 font-bold">Countdown</p>
            <div className="grid grid-cols-4 gap-2 mb-8">
              {/* Days */}
              <div className="flex flex-col items-center">
                <span className="f1-font text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {String(countdown.days).padStart(2, "0")}
                </span>
                <span className="f1-font text-xs text-gray-600 tracking-wide mt-1 font-bold">D</span>
              </div>

              {/* Hours */}
              <div className="flex flex-col items-center">
                <span className="f1-font text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {String(countdown.hours).padStart(2, "0")}
                </span>
                <span className="f1-font text-xs text-gray-600 tracking-wide mt-1 font-bold">H</span>
              </div>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <span className="f1-font text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {String(countdown.minutes).padStart(2, "0")}
                </span>
                <span className="f1-font text-xs text-gray-600 tracking-wide mt-1 font-bold">M</span>
              </div>

              {/* Seconds */}
              <div className="flex flex-col items-center">
                <span className="f1-font text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {String(countdown.seconds).padStart(2, "0")}
                </span>
                <span className="f1-font text-xs text-gray-600 tracking-wide mt-1 font-bold">S</span>
              </div>
            </div>

            {/* Date and Time Below Countdown */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Date */}
              <div className="flex-1">
                <p className="f1-font text-xs text-gray-600 tracking-widest uppercase mb-2 font-bold">Date</p>
                <p className="f1-font text-sm text-white font-light">{formattedDate}</p>
              </div>

              {/* Time */}
              <div className="flex-1">
                <p className="f1-font text-xs text-gray-600 tracking-widest uppercase mb-2 font-bold">Time</p>
                <p className="f1-font text-sm text-white font-light">
                  {formattedTime} <span className="text-xs text-gray-600">{meeting.gmt_offset}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Empty for now */}
          <div className="md:col-span-2"></div>
        </div>
      </div>
    </div>
  );
}
