import Class from '../models/Class.js';
import Section from '../models/Section.js';
import Student from '../models/Student.js';
import StudentClass from '../models/StudentClass.js';
import PromotionRecord from '../models/PromotionRecord.js';
import { getClassResults } from './examResultService.js';

export class PromotionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Where a class sits in the school's hierarchy.
 *
 * Prefers the explicit `promotion_order`; falls back to the leading number in
 * cl_name or cl_no ("Class 4" / "Grade 10" / "G10" -> 4 / 10 / 10) so schools
 * that never set the field still get sensible ordering. Classes with neither
 * sort last and never act as a promotion target.
 */
export const orderOf = (klass) => {
  if (typeof klass.promotion_order === 'number') return klass.promotion_order;
  const fromName = /(\d+)/.exec(klass.cl_name ?? '');
  if (fromName) return Number(fromName[1]);
  const fromNo = /(\d+)/.exec(klass.cl_no ?? '');
  if (fromNo) return Number(fromNo[1]);
  return null;
};

/**
 * The class students in `klass` normally move into: the explicit
 * `next_class_id` when set, otherwise the class with the smallest order
 * strictly greater than this one. Returns null at the top of the school.
 */
export const nextClassFor = (klass, allClasses) => {
  if (klass.is_final_class) return null;

  if (klass.next_class_id) {
    const explicit = allClasses.find(
      (c) => String(c._id) === String(klass.next_class_id._id ?? klass.next_class_id)
    );
    if (explicit) return explicit;
  }

  const current = orderOf(klass);
  if (current === null) return null;

  return (
    allClasses
      .filter((c) => {
        const order = orderOf(c);
        return order !== null && order > current;
      })
      .sort((a, b) => orderOf(a) - orderOf(b))[0] ?? null
  );
};

/**
 * The promotion ladder for the whole school — what the Setup screen lists and
 * what makes the default target visible before anyone commits to it.
 */
export const getPromotionLadder = async () => {
  const classes = await Class.find().populate('lev_no', 'lev_name lev_no').sort({ cl_name: 1 });
  const sections = await Section.find();

  const ordered = [...classes].sort((a, b) => {
    const oa = orderOf(a);
    const ob = orderOf(b);
    if (oa === null) return 1;
    if (ob === null) return -1;
    return oa - ob;
  });

  // One query for the whole school rather than one per class.
  const counts = await Student.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $group: { _id: '$classId', count: { $sum: 1 } } }
  ]);
  const countBy = new Map(counts.map((c) => [String(c._id), c.count]));

  return ordered.map((klass) => {
    const next = nextClassFor(klass, ordered);
    const classSections = sections.filter(
      (s) => String(s.class) === String(klass._id)
    );
    const nextSections = next
      ? sections.filter((s) => String(s.class) === String(next._id))
      : [];

    return {
      _id: String(klass._id),
      cl_no: klass.cl_no,
      cl_name: klass.cl_name,
      level: klass.lev_no?.lev_name ?? null,
      promotion_order: orderOf(klass),
      is_final_class: Boolean(klass.is_final_class),
      student_count: countBy.get(String(klass._id)) ?? 0,
      // Sections are optional; an empty list means this class isn't streamed.
      has_sections: classSections.length > 0,
      sections: classSections.map((s) => ({ _id: String(s._id), name: s.name })),
      next_class: next
        ? {
            _id: String(next._id),
            cl_name: next.cl_name,
            has_sections: nextSections.length > 0,
            sections: nextSections.map((s) => ({ _id: String(s._id), name: s.name }))
          }
        : null
    };
  });
};

/**
 * The promotion worksheet for one class: every enrolled student, their latest
 * published exam percentage, and the auto-computed decision.
 *
 * `exam_period_id` / `exam_id` pick which examination the pass/fail decision
 * reads from; without one, every student comes back undecided so staff set the
 * outcome themselves rather than the system inventing a result.
 */
export const getPromotionPreview = async ({ class_id, exam_period_id, exam_id, pass_percentage = 50 }) => {
  const klass = await Class.findById(class_id);
  if (!klass) throw new PromotionError('Class not found', 404);

  const allClasses = await Class.find();
  const next = nextClassFor(klass, allClasses);

  const students = await Student.find({ classId: class_id, isDeleted: { $ne: true } })
    .select('firstName lastName admissionNumber classId sectionId')
    .populate('sectionId', 'name')
    .sort({ admissionNumber: 1 });

  // Percentages come from published results only; nothing is fabricated when
  // an examination hasn't been published yet.
  let percentageBy = new Map();
  if (exam_period_id || exam_id) {
    const { results } = await getClassResults({ exam_period_id, exam_id, class_id });
    percentageBy = new Map(results.map((r) => [r.student.id, r.percentage]));
  }

  return {
    class: {
      _id: String(klass._id),
      cl_name: klass.cl_name,
      is_final_class: Boolean(klass.is_final_class)
    },
    next_class: next ? { _id: String(next._id), cl_name: next.cl_name } : null,
    pass_percentage,
    has_results: percentageBy.size > 0,
    students: students.map((student) => {
      const percentage = percentageBy.get(String(student._id)) ?? null;
      return {
        studentId: String(student._id),
        rollNo: student.admissionNumber,
        name: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
        sectionId: student.sectionId ? String(student.sectionId._id) : null,
        sectionName: student.sectionId?.name ?? null,
        percentage,
        // null = no published result to decide on; staff choose explicitly.
        isPass: percentage === null ? null : percentage >= pass_percentage,
        decision: percentage === null ? null : percentage >= pass_percentage ? 'promote' : 'retain'
      };
    })
  };
};

/** Move one student, writing the enrolment row and the audit record. */
const applyMove = async ({
  student,
  toClass,
  toSectionId,
  type,
  reason,
  percentage,
  yearId,
  batchId,
  performedBy
}) => {
  const fromClass = student.classId;
  const fromSection = student.sectionId ?? null;

  if (type !== 'retained') {
    student.classId = toClass ? toClass._id : student.classId;
    student.sectionId = toSectionId ?? null;
    student.admissionType = 'Promoted';
    await student.save();

    if (toClass) {
      await StudentClass.create({
        sc_no: `SC-${Date.now()}-${String(student._id).slice(-6)}`,
        student: student._id,
        class: toClass._id,
        section: toSectionId ?? null,
        year: yearId
      });
    }
  }

  return PromotionRecord.create({
    student: student._id,
    type,
    from_class: fromClass,
    from_section: fromSection,
    to_class: type === 'retained' ? fromClass : toClass?._id ?? null,
    to_section: type === 'retained' ? fromSection : toSectionId ?? null,
    academic_year: yearId,
    reason,
    percentage,
    batch_id: batchId,
    performed_by: performedBy
  });
};

/**
 * Check the destination section is usable: required when the target class is
 * streamed, rejected when it isn't, and always required to belong to that class.
 */
const resolveSection = async (toClass, sectionId, { label }) => {
  if (!toClass) return null;

  const sections = await Section.find({ class: toClass._id });

  if (sections.length === 0) {
    // Class isn't streamed — a section here would be meaningless.
    return null;
  }

  if (!sectionId) {
    throw new PromotionError(
      `${toClass.cl_name} is divided into sections — choose which section ${label} moves into.`
    );
  }

  const match = sections.find((s) => String(s._id) === String(sectionId));
  if (!match) {
    throw new PromotionError(`That section does not belong to ${toClass.cl_name}.`);
  }
  return match._id;
};

/**
 * Normal promotion for a whole class: each student either moves into the next
 * class in the hierarchy or is retained. The destination is computed, never
 * chosen — moving a student anywhere else goes through promoteSpecial.
 */
export const promoteClass = async ({ class_id, year_id, decisions = [], section_map = {} }, user) => {
  const klass = await Class.findById(class_id);
  if (!klass) throw new PromotionError('Class not found', 404);

  const allClasses = await Class.find();
  const next = nextClassFor(klass, allClasses);
  const graduating = next === null;

  const batchId = `PROM-${Date.now()}`;
  const results = { promoted: 0, retained: 0, graduated: 0, records: [] };

  for (const decision of decisions) {
    const student = await Student.findOne({
      _id: decision.studentId,
      classId: class_id,
      isDeleted: { $ne: true }
    });
    if (!student) {
      throw new PromotionError('One or more students are not enrolled in this class');
    }

    const label = `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || 'this student';

    if (decision.decision === 'retain') {
      const record = await applyMove({
        student,
        toClass: null,
        toSectionId: null,
        type: 'retained',
        reason: decision.reason,
        percentage: decision.percentage ?? null,
        yearId: year_id,
        batchId,
        performedBy: user._id
      });
      results.retained += 1;
      results.records.push(record);
      continue;
    }

    if (graduating) {
      const record = await applyMove({
        student,
        toClass: null,
        toSectionId: null,
        type: 'graduated',
        reason: decision.reason,
        percentage: decision.percentage ?? null,
        yearId: year_id,
        batchId,
        performedBy: user._id
      });
      results.graduated += 1;
      results.records.push(record);
      continue;
    }

    // section_map lets staff place students into the destination class's
    // sections one by one; a single entry under '*' applies to everyone.
    const requested = section_map[decision.studentId] ?? section_map['*'] ?? null;
    const toSectionId = await resolveSection(next, requested, { label });

    const record = await applyMove({
      student,
      toClass: next,
      toSectionId,
      type: 'normal',
      reason: decision.reason,
      percentage: decision.percentage ?? null,
      yearId: year_id,
      batchId,
      performedBy: user._id
    });
    results.promoted += 1;
    results.records.push(record);
  }

  return {
    batch_id: batchId,
    from_class: { _id: String(klass._id), cl_name: klass.cl_name },
    to_class: next ? { _id: String(next._id), cl_name: next.cl_name } : null,
    ...results,
    records: results.records.length
  };
};

/**
 * Normal promotion for a single student — the one-student equivalent of
 * promoteClass, used by POST /api/students/:id/promote.
 *
 * The destination is always the next class in the hierarchy. A caller that
 * names a different class is refused and pointed at promoteSpecial, which is
 * what stops Class 4 -> Class 8 happening silently as a "normal" promotion.
 */
export const promoteOne = async ({ student_id, to_class_id, to_section_id, year_id }, user) => {
  const student = await Student.findOne({ _id: student_id, isDeleted: { $ne: true } });
  if (!student) throw new PromotionError('Student not found', 404);

  const klass = await Class.findById(student.classId);
  if (!klass) throw new PromotionError("This student's current class no longer exists", 404);

  const allClasses = await Class.find();
  const next = nextClassFor(klass, allClasses);

  if (!next) {
    throw new PromotionError(
      `${klass.cl_name} is the final class — record a graduation rather than a promotion.`
    );
  }

  if (to_class_id && String(to_class_id) !== String(next._id)) {
    const requested = allClasses.find((c) => String(c._id) === String(to_class_id));
    throw new PromotionError(
      `Students in ${klass.cl_name} are normally promoted to ${next.cl_name}, not ` +
        `${requested?.cl_name ?? 'that class'}. Use special promotion (with a reason) ` +
        'to move a student outside the normal path.'
    );
  }

  const label = `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || 'this student';
  const toSectionId = await resolveSection(next, to_section_id, { label });

  const record = await applyMove({
    student,
    toClass: next,
    toSectionId,
    type: 'normal',
    reason: undefined,
    percentage: null,
    yearId: year_id,
    batchId: null,
    performedBy: user._id
  });

  return { student, record, to_class: next };
};

/**
 * Special promotion / class transfer: move one student into a class that is
 * NOT the next one in the hierarchy.
 *
 * Requires a reason and records who did it, so an exceptional move (a skipped
 * class, a transfer evaluation, an administrative correction) leaves a trail
 * instead of looking like a normal promotion.
 */
export const promoteSpecial = async ({ student_id, to_class_id, to_section_id, reason, year_id }, user) => {
  if (!reason || !reason.trim()) {
    throw new PromotionError('A reason is required for a special promotion');
  }

  const student = await Student.findOne({ _id: student_id, isDeleted: { $ne: true } });
  if (!student) throw new PromotionError('Student not found', 404);

  const toClass = await Class.findById(to_class_id);
  if (!toClass) throw new PromotionError('Destination class not found', 404);

  if (String(student.classId) === String(toClass._id)) {
    throw new PromotionError('The student is already in that class');
  }

  const label = `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || 'this student';
  const toSectionId = await resolveSection(toClass, to_section_id, { label });

  const record = await applyMove({
    student,
    toClass,
    toSectionId,
    type: 'special',
    reason: reason.trim(),
    percentage: null,
    yearId: year_id,
    batchId: null,
    performedBy: user._id
  });

  return record.populate([
    { path: 'student', select: 'firstName lastName admissionNumber' },
    { path: 'from_class', select: 'cl_name' },
    { path: 'to_class', select: 'cl_name' },
    { path: 'performed_by', select: 'username firstName lastName' }
  ]);
};

/** Audit history, newest first — the whole school, one class, or one student. */
export const getPromotionHistory = async ({ student_id, class_id, batch_id, type, limit = 200 }) => {
  const filter = {};
  if (student_id) filter.student = student_id;
  if (batch_id) filter.batch_id = batch_id;
  if (type) filter.type = { $in: String(type).split(',') };
  if (class_id) filter.$or = [{ from_class: class_id }, { to_class: class_id }];

  return PromotionRecord.find(filter)
    .populate([
      { path: 'student', select: 'firstName lastName admissionNumber' },
      { path: 'from_class', select: 'cl_name' },
      { path: 'from_section', select: 'name' },
      { path: 'to_class', select: 'cl_name' },
      { path: 'to_section', select: 'name' },
      { path: 'academic_year', select: 'y_name' },
      { path: 'performed_by', select: 'username firstName lastName' }
    ])
    .sort({ performed_at: -1 })
    .limit(Number(limit));
};
