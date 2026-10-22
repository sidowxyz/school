import { describe, expect, it } from 'vitest';
import type { TeacherAssignment } from '@/features/teachers/types';
import {
  teachingSessionLabel,
  teachingSessionsForDate,
  weekdayForDate,
} from './portalData';

const assignment: TeacherAssignment = {
  _id: 'assignment-1',
  teacherId: 'teacher-1',
  subjectId: { _id: 'subject-1', sub_name: 'Physics', sub_no: 'PHY' },
  classId: { _id: 'class-1', cl_name: 'Grade 11', cl_no: 'G11' },
  sectionId: { _id: 'section-1', name: 'A' },
  termId: { _id: 'term-1', name: 'Term 1' },
  timetableSlots: [
    {
      day: 'Monday',
      periodId: { _id: 'period-2', per_no: '2', per_name: 'Second Period', time_in: '09:00', time_out: '10:00' },
    },
    {
      day: 'Monday',
      periodId: { _id: 'period-1', per_no: '1', per_name: 'First Period', time_in: '08:00', time_out: '09:00' },
    },
  ],
};

describe('teacher portal academic session options', () => {
  it('uses only the teacher assignment slots for the selected weekday', () => {
    expect(weekdayForDate('2026-08-17')).toBe('Monday');
    const sessions = teachingSessionsForDate([assignment], '2026-08-17');

    expect(sessions.map((session) => session.periodId)).toEqual(['period-1', 'period-2']);
    expect(sessions.every((session) => session.assignmentId === assignment._id)).toBe(true);
  });

  it('does not manufacture fallback periods when none are scheduled', () => {
    expect(teachingSessionsForDate([assignment], '2026-08-18')).toEqual([]);
  });

  it('labels a session with exact academic-structure data', () => {
    const [session] = teachingSessionsForDate([assignment], '2026-08-17');
    expect(teachingSessionLabel(session)).toBe(
      'First Period (08:00 - 09:00) · Grade 11 - A · Physics',
    );
  });
});
