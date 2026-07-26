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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4 py-6">
      {/* Header with Flag Background and Gradient Title */}
      <div className="relative w-full max-w-4xl mb-8">
        {/* Flag Background */}
        {meeting.country_flag && (
          <div className="absolute inset-0 opacity-10 rounded-3xl overflow-hidden">
            <img
              src={meeting.country_flag}
              alt={meeting.country_name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Gradient Text Overlay */}
        <div className="relative z-10 text-center py-12">
          <h1 className="text-5xl md:text-6xl font-light tracking-tight bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            {meeting.meeting_name}
          </h1>

          {/* Official Name */}
          {meeting.meeting_official_name && (
            <p className="text-xs text-gray-500 mt-4 font-light tracking-wide line-clamp-2">
              {meeting.meeting_official_name}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-900 mb-8 w-full max-w-4xl" />

      {/* Main Content - Left to Right */}
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Countdown Section */}
          <div className="md:col-span-2">
            <p className="text-xs text-gray-600 tracking-widest uppercase mb-3">Countdown</p>
            <div className="grid grid-cols-4 gap-2">
              {/* Days */}
              <div className="flex flex-col items-center">
                <span className="text-2xl md:text-3xl font-light text-white tracking-tight">
                  {String(countdown.days).padStart(2, "0")}
                </span>
                <span className="text-xs text-gray-600 tracking-wide mt-1">D</span>
              </div>

              {/* Hours */}
              <div className="flex flex-col items-center">
                <span className="text-2xl md:text-3xl font-light text-white tracking-tight">
                  {String(countdown.hours).padStart(2, "0")}
                </span>
                <span className="text-xs text-gray-600 tracking-wide mt-1">H</span>
              </div>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <span className="text-2xl md:text-3xl font-light text-white tracking-tight">
                  {String(countdown.minutes).padStart(2, "0")}
                </span>
                <span className="text-xs text-gray-600 tracking-wide mt-1">M</span>
              </div>

              {/* Seconds */}
              <div className="flex flex-col items-center">
                <span className="text-2xl md:text-3xl font-light text-white tracking-tight">
                  {String(countdown.seconds).padStart(2, "0")}
                </span>
                <span className="text-xs text-gray-600 tracking-wide mt-1">S</span>
              </div>
            </div>
          </div>

          {/* Right Side Info */}
          <div className="md:col-span-2 space-y-4">
            {/* Circuit */}
            <div>
              <p className="text-xs text-gray-600 tracking-widest uppercase mb-2">Circuit</p>
              <p className="text-sm text-white font-light">{meeting.circuit_short_name}</p>
            </div>

            {/* Date */}
            <div>
              <p className="text-xs text-gray-600 tracking-widest uppercase mb-2">Date</p>
              <p className="text-sm text-white font-light">{formattedDate}</p>
            </div>

            {/* Time */}
            <div>
              <p className="text-xs text-gray-600 tracking-widest uppercase mb-2">Time</p>
              <p className="text-sm text-white font-light">
                {formattedTime} <span className="text-xs text-gray-600">{meeting.gmt_offset}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
