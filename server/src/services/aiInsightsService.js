import mongoose from 'mongoose';
import Teacher from '../models/Teacher.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import TeachingLog from '../models/TeachingLog.js';
import Term from '../models/Term.js';

/**
 * Aggregations the SMS did not previously expose.
 *
 * These live in services/ rather than in src/ai/ deliberately: they are ordinary
 * school queries that any part of the app could want, not assistant-specific
 * logic. Keeping them here preserves the rule that AI tools only ever call
 * services, and means the teaching-log module can reuse them.
 */

const startOfDay = (d) => {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
};

const endOfDay = (d) => {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
};

/**
 * Teachers who have not submitted a completed teaching log for a given day.
 *
 * Defined by teacher and date rather than by expected timetable slot on
 * purpose: TeachingLog.classId is a String while TeacherAssignment.classId is
 * an ObjectId, so a slot-by-slot join between them is not reliable. Teacher +
 * date uses only well-typed fields and answers the question actually asked —
 * "who hasn't submitted today's log?"
 */
export const getMissingTeachingLogsService = async ({ date } = {}) => {
  const target = date ? new Date(date) : new Date();
  if (Number.isNaN(target.getTime())) {
    throw new Error('Invalid date supplied.');
  }

  const from = startOfDay(target);
  const to = endOfDay(target);

  // Teacher has a pre-find hook filtering out soft-deleted records.
  const activeTeachers = await Teacher.find({ status: 'Active' })
    .populate('userId', 'firstName lastName email')
    .select('userId staffId department');

  const [completedIds, draftIds] = await Promise.all([
    TeachingLog.distinct('teacherId', { date: { $gte: from, $lte: to }, status: 'completed' }),
    TeachingLog.distinct('teacherId', { date: { $gte: from, $lte: to }, status: 'draft' }),
  ]);

  const completed = new Set(completedIds.map(String));
  const drafted = new Set(draftIds.map(String));

  const missing = [];
  const draftOnly = [];

  for (const teacher of activeTeachers) {
    const id = teacher._id.toString();
    if (completed.has(id)) continue;

    const row = {
      teacherId: id,
      staffId: teacher.staffId ?? '',
      name: teacher.userId
        ? `${teacher.userId.firstName ?? ''} ${teacher.userId.lastName ?? ''}`.trim()
        : 'Unknown',
      department: teacher.department ?? '',
    };

    if (drafted.has(id)) draftOnly.push(row);
    else missing.push(row);
  }

  return {
    date: from.toISOString().slice(0, 10),
    totalActiveTeachers: activeTeachers.length,
    submittedCount: completed.size,
    missingCount: missing.length,
    draftOnlyCount: draftOnly.length,
    missing,
    draftOnly,
  };
};

/**
 * Teaching load per teacher: how many assignments and timetable periods a week.
 */
export const getTeacherWorkloadService = async ({ termId } = {}) => {
  const match = {};
  if (termId) {
    if (!mongoose.isValidObjectId(termId)) throw new Error('Invalid termId supplied.');
    match.termId = new mongoose.Types.ObjectId(termId);
  }

  const assignments = await TeacherAssignment.find(match)
    .populate({ path: 'teacherId', select: 'userId staffId department', populate: { path: 'userId', select: 'firstName lastName' } })
    .populate('subjectId', 'sub_name')
    .populate('classId', 'cl_name');

  const byTeacher = new Map();

  for (const a of assignments) {
    if (!a.teacherId) continue;
    const id = a.teacherId._id.toString();

    if (!byTeacher.has(id)) {
      byTeacher.set(id, {
        teacherId: id,
        staffId: a.teacherId.staffId ?? '',
        name: a.teacherId.userId
          ? `${a.teacherId.userId.firstName ?? ''} ${a.teacherId.userId.lastName ?? ''}`.trim()
          : 'Unknown',
        department: a.teacherId.department ?? '',
        assignments: 0,
        periodsPerWeek: 0,
        subjects: new Set(),
        classes: new Set(),
      });
    }

    const row = byTeacher.get(id);
    row.assignments += 1;
    row.periodsPerWeek += (a.timetableSlots ?? []).length;
    if (a.subjectId?.sub_name) row.subjects.add(a.subjectId.sub_name);
    if (a.classId?.cl_name) row.classes.add(a.classId.cl_name);
  }

  const teachers = [...byTeacher.values()]
    .map((r) => ({
      ...r,
      subjects: [...r.subjects].join(', '),
      classes: [...r.classes].join(', '),
      subjectCount: r.subjects.size,
      classCount: r.classes.size,
    }))
    .sort((a, b) => b.periodsPerWeek - a.periodsPerWeek);

  const totalPeriods = teachers.reduce((sum, t) => sum + t.periodsPerWeek, 0);

  return {
    teacherCount: teachers.length,
    totalPeriodsPerWeek: totalPeriods,
    averagePeriodsPerTeacher: teachers.length
      ? Math.round((totalPeriods / teachers.length) * 10) / 10
      : 0,
    teachers,
  };
};
