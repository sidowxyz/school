import { jest } from '@jest/globals';

import {
  resolveSchedule,
  timesOverlap,
  timeToMinutes,
  formatDuration
} from '../../src/utils/examTime.js';
import { gradeForPercentage, percentageOf, assignRanks } from '../../src/utils/examGrading.js';

// Pure helpers — no database, so these run without a Mongo connection.
jest.setTimeout(10000);

describe('resolveSchedule', () => {
  it('derives the end time from a start time and duration', () => {
    expect(resolveSchedule({ start_time: '08:00', duration_minutes: 120 })).toEqual({
      start_time: '08:00',
      end_time: '10:00',
      duration_minutes: 120
    });
  });

  it('handles durations that are not whole hours', () => {
    expect(resolveSchedule({ start_time: '08:00', duration_minutes: 90 }).end_time).toBe('09:30');
  });

  it('derives the duration from a start and end time', () => {
    expect(resolveSchedule({ start_time: '10:00', end_time: '12:00' })).toEqual({
      start_time: '10:00',
      end_time: '12:00',
      duration_minutes: 120
    });
  });

  it('prefers the duration when both duration and end time are supplied', () => {
    // Duration is what staff edit, so end_time is treated as derived.
    expect(resolveSchedule({ start_time: '08:00', end_time: '23:00', duration_minutes: 60 }).end_time)
      .toBe('09:00');
  });

  it('rejects an end time that is before the start time', () => {
    expect(() => resolveSchedule({ start_time: '10:00', end_time: '09:00' }))
      .toThrow('End time must be after the start time');
  });

  it('rejects an end time equal to the start time', () => {
    expect(() => resolveSchedule({ start_time: '10:00', end_time: '10:00' }))
      .toThrow('End time must be after the start time');
  });

  it('rejects a duration that runs past midnight', () => {
    expect(() => resolveSchedule({ start_time: '23:00', duration_minutes: 120 }))
      .toThrow(/past midnight/);
  });

  it('rejects a non-positive duration', () => {
    expect(() => resolveSchedule({ start_time: '08:00', duration_minutes: 0 }))
      .toThrow(/positive number of minutes/);
  });

  it('rejects a malformed start time', () => {
    expect(() => resolveSchedule({ start_time: '8am', duration_minutes: 60 }))
      .toThrow(/HH:MM/);
  });

  it('requires either a duration or an end time', () => {
    expect(() => resolveSchedule({ start_time: '08:00' }))
      .toThrow(/duration or a valid end time/);
  });
});

describe('timesOverlap', () => {
  it('detects an overlapping window', () => {
    expect(timesOverlap('08:00', '10:00', '09:00', '11:00')).toBe(true);
  });

  it('treats back-to-back exams as not overlapping', () => {
    expect(timesOverlap('08:00', '10:00', '10:00', '12:00')).toBe(false);
  });

  it('detects a fully contained window', () => {
    expect(timesOverlap('08:00', '12:00', '09:00', '10:00')).toBe(true);
  });

  it('returns false for separate windows', () => {
    expect(timesOverlap('08:00', '09:00', '10:00', '11:00')).toBe(false);
  });
});

describe('timeToMinutes', () => {
  it('parses a valid time', () => {
    expect(timeToMinutes('14:30')).toBe(870);
  });

  it('returns null for an invalid time', () => {
    expect(timeToMinutes('25:00')).toBeNull();
    expect(timeToMinutes('noon')).toBeNull();
    expect(timeToMinutes(undefined)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(120)).toBe('2 hr');
    expect(formatDuration(90)).toBe('1 hr 30 min');
    expect(formatDuration(45)).toBe('45 min');
  });
});

describe('grading', () => {
  it('maps percentages to grade bands', () => {
    expect(gradeForPercentage(95)).toBe('A+');
    expect(gradeForPercentage(80)).toBe('A');
    expect(gradeForPercentage(72)).toBe('B');
    expect(gradeForPercentage(50)).toBe('D');
    expect(gradeForPercentage(49)).toBe('F');
  });

  it('computes a percentage against the exam total', () => {
    expect(percentageOf(45, 60)).toBe(75);
    expect(percentageOf(0, 0)).toBe(0);
  });

  it('gives tied totals the same rank and skips the next', () => {
    const ranked = assignRanks([
      { totalObtained: 90 },
      { totalObtained: 80 },
      { totalObtained: 80 },
      { totalObtained: 70 }
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });
});
