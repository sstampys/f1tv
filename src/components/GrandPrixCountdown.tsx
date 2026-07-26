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
        <div className="text-gray-400 text-center text-sm tracking-wide">Loading next race</div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-gray-400 text-center text-sm">No upcoming races found</div>
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-6 py-16">
      {/* Country Flag - Apple style */}
      {meeting.country_flag && (
        <div className="mb-12">
          <img
            src={meeting.country_flag}
            alt={meeting.country_name}
            className="w-56 h-36 object-cover rounded-3xl shadow-2xl"
          />
        </div>
      )}

      {/* Race Title - Large and Bold */}
      <h1 className="text-5xl md:text-7xl font-bold text-white text-center mb-3 leading-tight">
        {meeting.meeting_name}
      </h1>

      {/* Official Name - Subtle secondary text */}
      {meeting.meeting_official_name && (
        <p className="text-base md:text-lg text-gray-500 text-center mb-16 max-w-3xl font-light">
          {meeting.meeting_official_name}
        </p>
      )}

      {/* Location and Circuit Info - Minimal cards */}
      <div className="grid grid-cols-3 gap-6 mb-20 w-full max-w-2xl">
        <div className="text-center">
          <p className="text-xs text-gray-600 mb-2 tracking-widest uppercase">Location</p>
          <p className="text-lg text-white font-medium">{meeting.location}</p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-600 mb-2 tracking-widest uppercase">Circuit</p>
          <p className="text-lg text-white font-medium">{meeting.circuit_short_name}</p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-600 mb-2 tracking-widest uppercase">Type</p>
          <p className="text-lg text-white font-medium">{meeting.circuit_type}</p>
        </div>
      </div>

      {/* Countdown - Large and Prominent */}
      <div className="mb-20 w-full max-w-4xl">
        <p className="text-xs text-gray-600 text-center mb-12 tracking-widest uppercase">Time Until Race</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-6xl font-light text-white mb-3 tracking-tight">
              {String(countdown.days).padStart(2, "0")}
            </div>
            <p className="text-xs text-gray-600 tracking-widest uppercase">Days</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-6xl font-light text-white mb-3 tracking-tight">
              {String(countdown.hours).padStart(2, "0")}
            </div>
            <p className="text-xs text-gray-600 tracking-widest uppercase">Hours</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-6xl font-light text-white mb-3 tracking-tight">
              {String(countdown.minutes).padStart(2, "0")}
            </div>
            <p className="text-xs text-gray-600 tracking-widest uppercase">Minutes</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="text-5xl md:text-6xl font-light text-white mb-3 tracking-tight">
              {String(countdown.seconds).padStart(2, "0")}
            </div>
            <p className="text-xs text-gray-600 tracking-widest uppercase">Seconds</p>
          </div>
        </div>
      </div>

      {/* Race Date and Time - Subtle footer */}
      <div className="text-center border-t border-gray-800 pt-12">
        <p className="text-sm text-gray-600 mb-3 tracking-widest uppercase">Race Date</p>
        <p className="text-2xl text-white font-light mb-4">{formattedDate}</p>
        <p className="text-xs text-gray-600">
          GMT Offset: {meeting.gmt_offset}
        </p>
      </div>
    </div>
  );
}
