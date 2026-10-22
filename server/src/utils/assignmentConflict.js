/**
 * The rules that decide whether two teaching assignments may coexist.
 *
 * Kept pure (no Mongoose) so the rules can be read and tested on their own;
 * teacherController resolves each timetable slot to real times, calls in here,
 * and turns the returned reason into a message.
 *
 * Rules, in the order they are checked:
 *   1. same class+section, same subject, overlapping time -> SUBJECT_DOUBLE_STAFFED
 *   2. same class+section, other subject, overlapping time -> CLASS_BUSY
 *   3. same teacher, any class, overlapping time           -> TEACHER_BUSY
 *   4. different class, same subject, same time            -> allowed
 *   5. same class, same subject, different time            -> allowed
 *
 * Team teaching is deliberately unsupported: rule 1 has no exemption. If the
 * school adopts it, that rule is the single thing to relax.
 */

export const CONFLICT = {
  SUBJECT_DOUBLE_STAFFED: 'SUBJECT_DOUBLE_STAFFED',
  CLASS_BUSY: 'CLASS_BUSY',
  TEACHER_BUSY: 'TEACHER_BUSY'
};

/**
 * Do two resolved slots overlap? Slots carry { day, startTime, endTime } with
 * "HH:MM" 24-hour times, which compare correctly as plain strings.
 *
 * Ranges are half-open, so 08:00-09:00 and 09:00-10:00 are back-to-back rather
 * than overlapping, while 08:00-09:00 and 08:30-09:30 do overlap.
 */
export const slotsOverlap = (a, b) =>
  a.day === b.day && a.startTime < b.endTime && b.startTime < a.endTime;

const sameRef = (a, b) => a != null && b != null && String(a) === String(b);

/** The first pair of overlapping slots between two assignments, or null. */
const overlappingSlots = (candidateSlots, otherSlots) => {
  for (const other of otherSlots) {
    for (const slot of candidateSlots) {
      if (slotsOverlap(other, slot)) return { candidateSlot: slot, otherSlot: other };
    }
  }
  return null;
};

/**
 * Why `candidate` cannot coexist with `other`, or null when they may.
 *
 * Both take the shape:
 *   { teacherId, classId, sectionId, subjectId, termId, slots: [{day,startTime,endTime}] }
 *
 * Assignments in different terms never conflict — they are not taught at the
 * same time of year.
 */
export const conflictBetween = (candidate, other) => {
  if (!sameRef(candidate.termId, other.termId)) return null;

  const overlap = overlappingSlots(candidate.slots, other.slots);
  if (!overlap) return null; // rule 5: same class and subject, different time

  const sameClass =
    sameRef(candidate.classId, other.classId) && sameRef(candidate.sectionId, other.sectionId);

  if (sameClass) {
    return {
      reason: sameRef(candidate.subjectId, other.subjectId)
        ? CONFLICT.SUBJECT_DOUBLE_STAFFED // rule 1
        : CONFLICT.CLASS_BUSY, // rule 2
      ...overlap
    };
  }

  // rule 3 — a teacher cannot be in two classes at once
  if (sameRef(candidate.teacherId, other.teacherId)) {
    return { reason: CONFLICT.TEACHER_BUSY, ...overlap };
  }

  // rule 4 — different classes, no shared teacher: no conflict
  return null;
};

/** The first conflict between `candidate` and any of `others`, or null. */
export const findConflict = (candidate, others) => {
  for (const other of others) {
    const conflict = conflictBetween(candidate, other);
    if (conflict) return { ...conflict, other };
  }
  return null;
};
