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
      {/* Country Flag - Smaller */}
      {meeting.country_flag && (
        <div className="mb-4">
          <img
            src={meeting.country_flag}
            alt={meeting.country_name}
            className="w-40 h-24 object-cover rounded-2xl"
          />
        </div>
      )}

      {/* Main Content Container */}
      <div className="w-full max-w-2xl text-center">
        {/* Race Title */}
        <h1 className="text-4xl md:text-5xl font-light text-white mb-2 tracking-tight">
          {meeting.meeting_name}
        </h1>

        {/* Official Name */}
        {meeting.meeting_official_name && (
          <p className="text-xs text-gray-500 mb-4 font-light tracking-wide line-clamp-2">
            {meeting.meeting_official_name}
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-gray-900 mb-4" />

        {/* Countdown Section */}
        <div className="mb-4">
          <p className="text-xs text-gray-600 tracking-widest uppercase mb-3">Countdown</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Days */}
            <div className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-light text-white tracking-tight">
                {String(countdown.days).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-600 tracking-wide mt-0.5">DAYS</span>
            </div>

            {/* Hours */}
            <div className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-light text-white tracking-tight">
                {String(countdown.hours).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-600 tracking-wide mt-0.5">HOURS</span>
            </div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-light text-white tracking-tight">
                {String(countdown.minutes).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-600 tracking-wide mt-0.5">MIN</span>
            </div>

            {/* Seconds */}
            <div className="flex flex-col items-center">
              <span className="text-3xl md:text-4xl font-light text-white tracking-tight">
                {String(countdown.seconds).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-600 tracking-wide mt-0.5">SEC</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-900 mb-4" />

        {/* Race Details */}
        <div className="space-y-3">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600 tracking-widest uppercase mb-1">Date</p>
              <p className="text-sm text-white font-light">{formattedDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 tracking-widest uppercase mb-1">Time</p>
              <p className="text-sm text-white font-light">{formattedTime}</p>
            </div>
          </div>

          {/* Location Details */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-600 tracking-widest uppercase mb-1">Location</p>
              <p className="text-xs text-white font-light">{meeting.location}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 tracking-widest uppercase mb-1">Circuit</p>
              <p className="text-xs text-white font-light">{meeting.circuit_short_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 tracking-widest uppercase mb-1">Type</p>
              <p className="text-xs text-white font-light">{meeting.circuit_type}</p>
            </div>
          </div>

          {/* Timezone */}
          <p className="text-xs text-gray-600 mt-2">{meeting.gmt_offset}</p>
        </div>
      </div>
    </div>
  );
}
