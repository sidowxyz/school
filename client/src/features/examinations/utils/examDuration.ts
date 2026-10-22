// Duration helpers mirroring server/src/utils/examTime.js. The server is
// authoritative — these exist so the form can show the end time as staff
// type, without a round trip.

export const timeToMinutes = (time: string | undefined): number | null => {
  if (!time) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** End time for a start time + duration, or null if either is unusable. */
export const endTimeFor = (
  startTime: string | undefined,
  durationMinutes: number | undefined
): string | null => {
  const start = timeToMinutes(startTime);
  if (start === null || !durationMinutes || durationMinutes <= 0) return null;
  const end = start + durationMinutes;
  if (end > 24 * 60) return null;
  return minutesToTime(end);
};

/** Minutes between two times, or null when the pair is invalid or inverted. */
export const durationBetween = (
  startTime: string | undefined,
  endTime: string | undefined
): number | null => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) return null;
  return end - start;
};

/** 90 -> "1 hr 30 min". */
export const formatDuration = (minutes: number | undefined | null): string => {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
};

/** "14:30" -> "2:30 PM". */
export const formatTime = (time: string | undefined): string => {
  const minutes = timeToMinutes(time);
  if (minutes === null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

// Durations offered as one-click presets; staff can still type any value.
export const DURATION_PRESETS = [
  { minutes: 30, label: "30 min" },
  { minutes: 45, label: "45 min" },
  { minutes: 60, label: "1 hr" },
  { minutes: 90, label: "1 hr 30 min" },
  { minutes: 120, label: "2 hr" },
  { minutes: 150, label: "2 hr 30 min" },
  { minutes: 180, label: "3 hr" },
];

/**
 * The duration a stored exam was configured with. Records created before
 * duration_minutes existed only have start/end times, so fall back to the
 * gap between them.
 */
export const examDuration = (exam: {
  duration_minutes?: number;
  start_time?: string;
  end_time?: string;
}): number | null => exam.duration_minutes ?? durationBetween(exam.start_time, exam.end_time);
