import { CONFLICT, conflictBetween, findConflict, slotsOverlap } from '../../src/utils/assignmentConflict.js';

// Pure rule engine — no database, so these run without a Mongo connection.

const TERM = 'term1';
const MON_8_9 = { day: 'Monday', startTime: '08:00', endTime: '09:00' };
const MON_830_930 = { day: 'Monday', startTime: '08:30', endTime: '09:30' };
const MON_9_10 = { day: 'Monday', startTime: '09:00', endTime: '10:00' };
const TUE_8_9 = { day: 'Tuesday', startTime: '08:00', endTime: '09:00' };

const assignment = (over = {}) => ({
  teacherId: 'ahmed',
  classId: 'grade5',
  sectionId: 'a',
  subjectId: 'maths',
  termId: TERM,
  slots: [MON_8_9],
  ...over,
});

describe('slotsOverlap', () => {
  it('treats back-to-back slots as not overlapping', () => {
    expect(slotsOverlap(MON_8_9, MON_9_10)).toBe(false);
  });

  it('detects a partial overlap, not just identical times', () => {
    expect(slotsOverlap(MON_8_9, MON_830_930)).toBe(true);
  });

  it('ignores slots on different days', () => {
    expect(slotsOverlap(MON_8_9, TUE_8_9)).toBe(false);
  });
});

describe('rule 1 — same class + same subject + overlapping time', () => {
  it('rejects a second teacher on the same subject at the same time', () => {
    const conflict = conflictBetween(
      assignment({ teacherId: 'mohamed' }),
      assignment({ teacherId: 'ahmed' }),
    );
    expect(conflict?.reason).toBe(CONFLICT.SUBJECT_DOUBLE_STAFFED);
  });

  it('rejects a partially overlapping second teacher too', () => {
    const conflict = conflictBetween(
      assignment({ teacherId: 'mohamed', slots: [MON_830_930] }),
      assignment({ teacherId: 'ahmed', slots: [MON_8_9] }),
    );
    expect(conflict?.reason).toBe(CONFLICT.SUBJECT_DOUBLE_STAFFED);
  });
});

describe('rule 2 — same class + different subject + overlapping time', () => {
  it('rejects because the class cannot sit two lessons at once', () => {
    const conflict = conflictBetween(
      assignment({ teacherId: 'mohamed', subjectId: 'english' }),
      assignment({ teacherId: 'ahmed', subjectId: 'maths' }),
    );
    expect(conflict?.reason).toBe(CONFLICT.CLASS_BUSY);
  });
});

describe('rule 3 — same teacher + different classes + overlapping time', () => {
  it('rejects because the teacher cannot be in two rooms at once', () => {
    const conflict = conflictBetween(
      assignment({ classId: 'grade6', subjectId: 'english' }),
      assignment({ classId: 'grade5', subjectId: 'maths' }),
    );
    expect(conflict?.reason).toBe(CONFLICT.TEACHER_BUSY);
  });

  it('rejects across a partial overlap', () => {
    const conflict = conflictBetween(
      assignment({ classId: 'grade6', slots: [MON_830_930] }),
      assignment({ classId: 'grade5', slots: [MON_8_9] }),
    );
    expect(conflict?.reason).toBe(CONFLICT.TEACHER_BUSY);
  });
});

describe('rule 4 — different classes + same subject + same time', () => {
  it('allows two teachers to run the same subject for different classes', () => {
    expect(
      conflictBetween(
        assignment({ teacherId: 'teacherB', classId: 'grade6' }),
        assignment({ teacherId: 'teacherA', classId: 'grade5' }),
      ),
    ).toBeNull();
  });

  it('treats a different section of the same class as a different group', () => {
    expect(
      conflictBetween(
        assignment({ teacherId: 'teacherB', sectionId: 'b' }),
        assignment({ teacherId: 'teacherA', sectionId: 'a' }),
      ),
    ).toBeNull();
  });
});

describe('rule 5 — same class + same subject + different time', () => {
  it('allows a second teacher in a later, non-overlapping period', () => {
    expect(
      conflictBetween(
        assignment({ teacherId: 'mohamed', slots: [MON_9_10] }),
        assignment({ teacherId: 'ahmed', slots: [MON_8_9] }),
      ),
    ).toBeNull();
  });

  it('allows the same slot on a different day', () => {
    expect(
      conflictBetween(
        assignment({ teacherId: 'mohamed', slots: [TUE_8_9] }),
        assignment({ teacherId: 'ahmed', slots: [MON_8_9] }),
      ),
    ).toBeNull();
  });
});

describe('term scoping', () => {
  it('does not conflict across different terms', () => {
    expect(
      conflictBetween(
        assignment({ teacherId: 'mohamed', termId: 'term2' }),
        assignment({ teacherId: 'ahmed', termId: 'term1' }),
      ),
    ).toBeNull();
  });
});

describe('findConflict', () => {
  it('returns the offending assignment alongside the reason', () => {
    const existing = [
      assignment({ teacherId: 'ahmed', slots: [TUE_8_9] }),
      assignment({ teacherId: 'ahmed', subjectId: 'english', slots: [MON_8_9] }),
    ];
    const conflict = findConflict(assignment({ teacherId: 'mohamed' }), existing);
    expect(conflict?.reason).toBe(CONFLICT.CLASS_BUSY);
    expect(conflict?.other.subjectId).toBe('english');
  });

  it('returns null when every existing assignment is compatible', () => {
    const existing = [
      assignment({ teacherId: 'ahmed', slots: [TUE_8_9] }),
      assignment({ teacherId: 'ahmed', classId: 'grade6' }),
    ];
    expect(findConflict(assignment({ teacherId: 'mohamed', slots: [MON_9_10] }), existing)).toBeNull();
  });
});
