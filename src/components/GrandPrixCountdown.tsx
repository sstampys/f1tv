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
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = raceDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-6 py-20">
      {/* Country Flag */}
      {meeting.country_flag && (
        <div className="mb-16">
          <img
            src={meeting.country_flag}
            alt={meeting.country_name}
            className="w-64 h-40 object-cover rounded-3xl"
          />
        </div>
      )}

      {/* Main Content Container */}
      <div className="w-full max-w-2xl text-center">
        {/* Race Title */}
        <h1 className="text-6xl md:text-7xl font-light text-white mb-6 tracking-tight">
          {meeting.meeting_name}
        </h1>

        {/* Official Name */}
        {meeting.meeting_official_name && (
          <p className="text-sm text-gray-500 mb-16 font-light tracking-wide">
            {meeting.meeting_official_name}
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-gray-900 mb-16" />

        {/* Countdown Section */}
        <div className="mb-16">
          <p className="text-xs text-gray-600 tracking-widest uppercase mb-12">Countdown</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Days */}
            <div className="flex flex-col items-center">
              <span className="text-5xl md:text-6xl font-light text-white tracking-tight mb-2">
                {String(countdown.days).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-600 tracking-wide">DAYS</span>
            </div>

            {/* Hours */}
            <div className="flex flex-col items-center">
              <span className="text-5xl md:text-6xl font-light text-white tracking-tight mb-2">
                {String(countdown.hours).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-600 tracking-wide">HOURS</span>
            </div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <span className="text-5xl md:text-6xl font-light text-white tracking-tight mb-2">
                {String(countdown.minutes).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-600 tracking-wide">MINUTES</span>
            </div>

            {/* Seconds */}
            <div className="flex flex-col items-center">
              <span className="text-5xl md:text-6xl font-light text-white tracking-tight mb-2">
                {String(countdown.seconds).padStart(2, "0")}
              </span>
              <span className="text-xs text-gray-600 tracking-wide">SECONDS</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-900 mb-16" />

        {/* Race Details */}
        <div className="space-y-6">
          {/* Date */}
          <div>
            <p className="text-xs text-gray-600 tracking-widest uppercase mb-2">Date</p>
            <p className="text-lg text-white font-light">{formattedDate}</p>
          </div>

          {/* Time */}
          <div>
            <p className="text-xs text-gray-600 tracking-widest uppercase mb-2">Time</p>
            <p className="text-lg text-white font-light">{formattedTime}</p>
            <p className="text-xs text-gray-600 mt-1">{meeting.gmt_offset}</p>
          </div>

          {/* Location Details */}
          <div className="pt-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-600 tracking-widest uppercase mb-2">Location</p>
                <p className="text-sm text-white font-light">{meeting.location}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 tracking-widest uppercase mb-2">Circuit</p>
                <p className="text-sm text-white font-light">{meeting.circuit_short_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 tracking-widest uppercase mb-2">Type</p>
                <p className="text-sm text-white font-light">{meeting.circuit_type}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
