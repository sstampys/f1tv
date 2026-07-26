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
        <div className="text-white text-center">Loading next race...</div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-center">No upcoming races found</div>
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4 py-8">
      {/* Country Flag */}
      {meeting.country_flag && (
        <img
          src={meeting.country_flag}
          alt={meeting.country_name}
          className="w-48 h-32 mb-8 object-cover shadow-2xl"
        />
      )}

      {/* Race Title */}
      <h1 className="text-4xl md:text-6xl font-bold text-white text-center mb-2">
        {meeting.meeting_name}
      </h1>

      {/* Official Name */}
      {meeting.meeting_official_name && (
        <p className="text-lg md:text-xl text-gray-400 text-center mb-8 max-w-2xl">
          {meeting.meeting_official_name}
        </p>
      )}

      {/* Location and Circuit Info */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12 w-full max-w-md">
        <div className="bg-gray-900 rounded-lg p-4 text-center border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">Location</p>
          <p className="text-white font-semibold">{meeting.location}</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 text-center border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">Circuit</p>
          <p className="text-white font-semibold">{meeting.circuit_short_name}</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 text-center border border-gray-800">
          <p className="text-gray-400 text-sm mb-1">Type</p>
          <p className="text-white font-semibold text-sm">{meeting.circuit_type}</p>
        </div>
      </div>

      {/* Countdown */}
      <div className="mb-12">
        <p className="text-gray-400 text-center mb-6 text-lg">Time Until Race</p>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center">
            <div className="bg-gray-900 text-white text-4xl md:text-5xl font-bold rounded-lg p-6 md:p-8 w-24 md:w-28 h-24 md:h-28 flex items-center justify-center border border-gray-700">
              {String(countdown.days).padStart(2, "0")}
            </div>
            <p className="text-gray-400 mt-2 text-sm">Days</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-gray-900 text-white text-4xl md:text-5xl font-bold rounded-lg p-6 md:p-8 w-24 md:w-28 h-24 md:h-28 flex items-center justify-center border border-gray-700">
              {String(countdown.hours).padStart(2, "0")}
            </div>
            <p className="text-gray-400 mt-2 text-sm">Hours</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-gray-900 text-white text-4xl md:text-5xl font-bold rounded-lg p-6 md:p-8 w-24 md:w-28 h-24 md:h-28 flex items-center justify-center border border-gray-700">
              {String(countdown.minutes).padStart(2, "0")}
            </div>
            <p className="text-gray-400 mt-2 text-sm">Minutes</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-gray-900 text-white text-4xl md:text-5xl font-bold rounded-lg p-6 md:p-8 w-24 md:w-28 h-24 md:h-28 flex items-center justify-center border border-gray-700">
              {String(countdown.seconds).padStart(2, "0")}
            </div>
            <p className="text-gray-400 mt-2 text-sm">Seconds</p>
          </div>
        </div>
      </div>

      {/* Race Date and Time */}
      <div className="text-center">
        <p className="text-gray-400 mb-2">Race Date</p>
        <p className="text-2xl text-white font-semibold">{formattedDate}</p>
        <p className="text-gray-400 mt-2 text-sm">
          GMT Offset: {meeting.gmt_offset}
        </p>
      </div>
    </div>
  );
}
