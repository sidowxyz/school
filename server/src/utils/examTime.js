/**
 * Shared helpers for the exam schedule fields (exam_date / start_time /
 * duration_minutes / end_time).
 *
 * Times are stored as "HH:MM" strings (what <input type="time"> produces);
 * duration is stored in minutes so "1 hour 30 minutes" is representable
 * without floating-point hours.
 */

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:MM" -> minutes since midnight, or null when unparseable. */
export const timeToMinutes = (time) => {
  if (typeof time !== 'string') return null;
  const match = TIME_RE.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

/** minutes since midnight -> "HH:MM" (wrapping past midnight is rejected by the caller). */
export const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const isValidTime = (time) => timeToMinutes(time) !== null;

/**
 * Fill in whichever of duration_minutes / end_time the caller omitted.
 *
 * Accepts a partial payload merged over the stored document, so an update
 * that only changes start_time is still checked against the stored end_time.
 * Returns { start_time, end_time, duration_minutes } or throws with a
 * user-facing message.
 */
export const resolveSchedule = ({ start_time, end_time, duration_minutes }) => {
  const start = timeToMinutes(start_time);
  if (start === null) {
    throw new Error('Start time is required and must be in HH:MM format');
  }

  const hasDuration = duration_minutes !== undefined && duration_minutes !== null && duration_minutes !== '';
  const duration = hasDuration ? Number(duration_minutes) : null;

  if (hasDuration && (!Number.isFinite(duration) || duration <= 0)) {
    throw new Error('Duration must be a positive number of minutes');
  }

  // Start time + duration wins when both are given — the duration field is
  // the one academic staff edit, so end_time is treated as derived.
  if (hasDuration) {
    const endMinutes = start + duration;
    if (endMinutes > 24 * 60) {
      throw new Error('Examination duration runs past midnight — shorten it or move the start time earlier');
    }
    return { start_time, end_time: minutesToTime(endMinutes), duration_minutes: duration };
  }

  const end = timeToMinutes(end_time);
  if (end === null) {
    throw new Error('Provide either an examination duration or a valid end time in HH:MM format');
  }
  if (end <= start) {
    throw new Error('End time must be after the start time');
  }

  return { start_time, end_time, duration_minutes: end - start };
};

/** Do [aStart, aEnd) and [bStart, bEnd) overlap? Inputs are "HH:MM". */
export const timesOverlap = (aStart, aEnd, bStart, bEnd) => {
  const a1 = timeToMinutes(aStart);
  const a2 = timeToMinutes(aEnd);
  const b1 = timeToMinutes(bStart);
  const b2 = timeToMinutes(bEnd);
  if ([a1, a2, b1, b2].some((v) => v === null)) return false;
  return a1 < b2 && b1 < a2;
};

/** Calendar-day key (UTC) for comparing exam_date values. */
export const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

/** Human label for a duration in minutes: 90 -> "1 hr 30 min". */
export const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
};
