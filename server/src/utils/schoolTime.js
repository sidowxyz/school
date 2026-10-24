// The school's own calendar. Servers (Render) run on UTC, but "today", "this
// month" and the fee month must follow the school's clock, or the first hours
// of each day and month land on the wrong date. Set SCHOOL_TIMEZONE to an IANA
// zone; the default suits a school in Somalia.
export const SCHOOL_TIMEZONE = process.env.SCHOOL_TIMEZONE || 'Africa/Mogadishu';

const parts = (date = new Date()) => {
  const out = {};
  for (const p of new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
};

/** Today's date at the school, as "YYYY-MM-DD". */
export const schoolToday = (date = new Date()) => {
  const { year, month, day } = parts(date);
  return `${year}-${month}-${day}`;
};

/** This month at the school, as "YYYY-MM" (the fee period format). */
export const schoolPeriod = (date = new Date()) => schoolToday(date).slice(0, 7);

/** Today at the school as a UTC-midnight Date, the way attendance dates are stored. */
export const schoolTodayUTC = (date = new Date()) => new Date(`${schoolToday(date)}T00:00:00.000Z`);
