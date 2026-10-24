import Term from '../models/Term.js';
import Class from '../models/Class.js';
import Section from '../models/Section.js';
import Period from '../models/Period.js';
import Student from '../models/Student.js';
import StudentClass from '../models/StudentClass.js';
import StudentAttendance from '../models/StudentAttendance.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import AppError from './AppError.js';

// What still points at each kind of academic record. Deleting a record that is
// in use would leave students, timetables and attendance pointing at nothing
// (and crash the pages that show them), so the delete is refused instead.
const REFERENCES = {
  year: (id) => [
    ['term', Term.countDocuments({ academicYearId: id })],
    ['student enrolment', StudentClass.countDocuments({ year: id })],
  ],
  term: (id) => [
    ['period', Period.countDocuments({ termId: id })],
    ['timetable assignment', TeacherAssignment.countDocuments({ termId: id })],
  ],
  level: (id) => [
    ['class', Class.countDocuments({ lev_no: id })],
  ],
  class: (id) => [
    ['student', Student.countDocuments({ classId: id, isDeleted: { $ne: true } })],
    ['section', Section.countDocuments({ class: id })],
    ['timetable assignment', TeacherAssignment.countDocuments({ classId: id })],
  ],
  section: (id) => [
    ['student', Student.countDocuments({ sectionId: id, isDeleted: { $ne: true } })],
    ['timetable assignment', TeacherAssignment.countDocuments({ sectionId: id })],
  ],
  subject: (id) => [
    ['timetable assignment', TeacherAssignment.countDocuments({ subjectId: id })],
  ],
  period: (id) => [
    ['timetable lesson', TeacherAssignment.countDocuments({ 'timetableSlots.periodId': id })],
    ['attendance record', StudentAttendance.countDocuments({ periodId: id })],
  ],
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Throws a 409 naming what still uses the record, if anything does. */
export const assertNotInUse = async (kind, id) => {
  const checks = REFERENCES[kind](id);
  const counts = await Promise.all(checks.map(([, q]) => q));
  const used = checks.map(([label], i) => [label, counts[i]]).filter(([, n]) => n > 0);
  if (used.length) {
    throw new AppError(`This ${kind} is still used by ${used.map(([label, n]) => plural(n, label)).join(' and ')}. Move or remove those first.`, 409);
  }
};
