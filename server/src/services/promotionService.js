// Moving students into the next school year.
//
// Each class gets a rule: promote to another class, repeat the same class, or
// graduate (leave the school). Single students can be set apart from their
// class's rule (e.g. one repeats while the rest go up). Promoting a student
// moves them to the new class and enrols them in the new year; their old
// enrolment, marks and attendance stay as history.
//
// It works from each student's current class and skips anyone already enrolled
// in the target year, so running it twice never moves a student twice.
import Student from '../models/Student.js';
import StudentClass from '../models/StudentClass.js';
import Class from '../models/Class.js';
import Section from '../models/Section.js';
import Year from '../models/Year.js';
import '../models/Level.js';
import AppError from '../utils/AppError.js';
import { updateStudentStatusService } from './studentService.js';

const sameId = (a, b) => String(a ?? '') === String(b ?? '');
const byName = (a, b) => a.cl_name.localeCompare(b.cl_name, undefined, { numeric: true, sensitivity: 'base' });

/** Classes in school order: by level, then by name ("Grade 2" before "Grade 10"). */
const orderedClasses = async () => {
  const classes = await Class.find().populate('lev_no', 'lev_no lev_name').lean();
  return classes.sort((a, b) =>
    String(a.lev_no?.lev_no ?? '').localeCompare(String(b.lev_no?.lev_no ?? ''), undefined, { numeric: true }) || byName(a, b));
};

const loadYear = async (yearId) => {
  const year = await Year.findById(yearId).lean();
  if (!year) throw new AppError('Choose the school year students are moving into.', 400);
  return year;
};

/** Each class with how many students still need moving into `toYearId`, and a suggested next class. */
export const promotionPlan = async (toYearId) => {
  const year = await loadYear(toYearId);
  const [classes, sections, students, enrolledInTarget] = await Promise.all([
    orderedClasses(),
    Section.find().select('name class capacity').sort({ name: 1 }).lean(),
    Student.find({ isDeleted: false, status: 'Active' }).select('classId sectionId').lean(),
    StudentClass.distinct('student', { year: toYearId }),
  ]);
  const done = new Set(enrolledInTarget.map(String));

  return {
    year: { _id: year._id, name: year.y_name },
    classes: classes.map((c, i) => {
      const inClass = students.filter((s) => sameId(s.classId, c._id));
      const waiting = inClass.filter((s) => !done.has(String(s._id)));
      return {
        _id: c._id,
        name: c.cl_name,
        level: c.lev_no?.lev_name ?? null,
        sections: sections.filter((s) => sameId(s.class, c._id)).map((s) => ({ _id: s._id, name: s.name, capacity: s.capacity ?? null })),
        waiting: waiting.length,
        alreadyMoved: inClass.length - waiting.length,
        // The next class up; the last class graduates.
        suggestion: classes[i + 1] ? { action: 'promote', toClassId: classes[i + 1]._id } : { action: 'graduate', toClassId: null },
      };
    }),
  };
};

/** Students of one class still waiting to be moved into `toYearId` (for setting exceptions). */
export const promotionStudents = async (toYearId, classId) => {
  const enrolledInTarget = new Set((await StudentClass.distinct('student', { year: toYearId })).map(String));
  const students = await Student.find({ classId, isDeleted: false, status: 'Active' })
    .select('firstName lastName admissionNumber sectionId')
    .populate('sectionId', 'name')
    .sort({ firstName: 1, lastName: 1 })
    .lean();
  return students
    .filter((s) => !enrolledInTarget.has(String(s._id)))
    .map((s) => ({ _id: s._id, name: [s.firstName, s.lastName].filter(Boolean).join(' '), admissionNumber: s.admissionNumber, section: s.sectionId?.name ?? null }));
};

const ACTIONS = ['promote', 'repeat', 'graduate', 'leave'];

/**
 * Run the move.
 * rules: [{ classId, action: 'promote'|'repeat'|'graduate', toClassId? }]
 * exceptions: { [studentId]: 'promote'|'repeat'|'graduate'|'leave' }
 */
export const runPromotion = async ({ toYearId, rules = [], exceptions = {} }) => {
  await loadYear(toYearId);
  if (!Array.isArray(rules) || !rules.length) throw new AppError('Choose what happens to at least one class.', 400);

  const classes = await Class.find().lean();
  const classById = new Map(classes.map((c) => [String(c._id), c]));
  const sections = await Section.find().lean();
  const sectionsOf = (classId) => sections.filter((s) => sameId(s.class, classId)).sort((a, b) => a.name.localeCompare(b.name));
  const enrolledInTarget = new Set((await StudentClass.distinct('student', { year: toYearId })).map(String));

  for (const rule of rules) {
    if (!classById.has(String(rule.classId))) throw new AppError('One of the classes was not found.', 400);
    if (!['promote', 'repeat', 'graduate'].includes(rule.action)) throw new AppError('Each class must promote, repeat or graduate.', 400);
    if (rule.action === 'promote' && !classById.has(String(rule.toClassId))) {
      throw new AppError(`Choose the class ${classById.get(String(rule.classId)).cl_name} moves up to.`, 400);
    }
  }
  for (const action of Object.values(exceptions)) {
    if (!ACTIONS.includes(action)) throw new AppError('Unknown choice for a student.', 400);
  }

  const counts = { promoted: 0, repeated: 0, graduated: 0, left: 0, skipped: 0 };
  const warnings = [];
  const headcount = new Map(); // section id -> students placed so far in the new year

  // Take every class's list before moving anyone: otherwise Grade 5, once moved
  // up into Grade 6, would be moved again by Grade 6's own rule in the same run.
  const studentsByRule = await Promise.all(rules.map((rule) => Student.find({ classId: rule.classId, isDeleted: false, status: 'Active' })));

  for (const [i, rule] of rules.entries()) {
    const fromClass = classById.get(String(rule.classId));
    for (const student of studentsByRule[i]) {
      if (enrolledInTarget.has(String(student._id))) { counts.skipped += 1; continue; }
      enrolledInTarget.add(String(student._id));
      let action = exceptions[String(student._id)] ?? rule.action;
      // A student told to "promote" from a class that graduates has nowhere to go.
      if (action === 'promote' && rule.action !== 'promote') action = rule.action === 'repeat' ? 'repeat' : 'graduate';

      if (action === 'graduate' || action === 'leave') {
        await updateStudentStatusService(student._id, action === 'graduate' ? 'Graduated' : 'Inactive');
        counts[action === 'graduate' ? 'graduated' : 'left'] += 1;
        continue;
      }

      const target = action === 'repeat' ? fromClass : classById.get(String(rule.toClassId));
      const targetSections = sectionsOf(target._id);
      let sectionId = null;
      if (targetSections.length) {
        // Keep the same section letter where it exists (10 A -> 11 A), else the first one.
        const currentName = sections.find((s) => sameId(s._id, student.sectionId))?.name;
        const keep = targetSections.find((s) => s.name === currentName) ?? targetSections[0];
        sectionId = keep._id;
        const placed = (headcount.get(String(keep._id)) ?? 0) + 1;
        headcount.set(String(keep._id), placed);
        if (keep.capacity && placed > keep.capacity && placed === keep.capacity + 1) {
          warnings.push(`${target.cl_name} ${keep.name} now has more students than its capacity of ${keep.capacity}.`);
        }
      }

      student.classId = target._id;
      student.sectionId = sectionId;
      await student.save();
      await StudentClass.updateOne(
        { student: student._id, year: toYearId },
        { $set: { class: target._id, section: sectionId }, $setOnInsert: { sc_no: `SC-${student._id}-${toYearId}` } },
        { upsert: true },
      );
      counts[action === 'repeat' ? 'repeated' : 'promoted'] += 1;
    }
  }
  return { ...counts, warnings };
};
