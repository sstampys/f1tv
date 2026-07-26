// Service to fetch F1 Grand Prix data using OpenF1 Meetings API
const F1_API_BASE = "https://api.openf1.org/v1";

export interface Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  location: string;
  country_name: string;
  country_code: string;
  country_key: number;
  country_flag: string;
  circuit_short_name: string;
  circuit_key: number;
  circuit_type: string;
  circuit_image: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  year: number;
}

export async function getNextGrandPrix(): Promise<Meeting | null> {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const dateStr = now.toISOString().split("T")[0];

    const response = await fetch(
      `${F1_API_BASE}/meetings?year=${currentYear}&date_start>=${dateStr}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      console.error("Failed to fetch meetings:", response.statusText);
      return null;
    }

    const meetings: Meeting[] = await response.json();

    if (!meetings || meetings.length === 0) {
      // Try next year if no races found this year
      const nextYear = currentYear + 1;
      const nextYearResponse = await fetch(
        `${F1_API_BASE}/meetings?year=${nextYear}`,
        { cache: "no-store" }
      );

      if (!nextYearResponse.ok) {
        return null;
      }

      const nextYearMeetings: Meeting[] = await nextYearResponse.json();
      return nextYearMeetings[0] ?? null;
    }

    return meetings[0];
  } catch (error) {
    console.error("Error fetching next Grand Prix:", error);
    return null;
  }
}

export function calculateTimeUntilRace(
  dateStart: string
): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
} {
  const now = new Date();
  const raceDate = new Date(dateStart);
  const diff = raceDate.getTime() - now.getTime();

  const totalSeconds = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds };
}
