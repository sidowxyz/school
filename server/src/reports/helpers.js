import Student from '../models/Student.js';
import StudentClass from '../models/StudentClass.js';
import Teacher from '../models/Teacher.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import ExamMarkSubmission from '../models/ExamMarkSubmission.js';

/** Shared shapes and lookups used across the report definitions. */

export class ReportError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const fullName = (person) =>
  person ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() : '';

export const round1 = (value) => Math.round(value * 10) / 10;

export const percent = (part, whole) => (whole > 0 ? round1((part / whole) * 100) : 0);

/** Reusable filter descriptors — the client renders a control per entry. */
export const FILTERS = {
  class: { key: 'class_id', label: 'Class', type: 'class' },
  section: { key: 'section_id', label: 'Section', type: 'section' },
  subject: { key: 'subject_id', label: 'Subject', type: 'subject' },
  examScope: { key: 'scope', label: 'Examination', type: 'exam-scope' },
  examPeriod: { key: 'exam_period_id', label: 'Examination Period', type: 'exam-period' },
  dateFrom: { key: 'from', label: 'From', type: 'date' },
  dateTo: { key: 'to', label: 'To', type: 'date' },
  threshold: { key: 'threshold', label: 'Threshold %', type: 'number', default: 50 },
  year: { key: 'year_id', label: 'Academic Year', type: 'year' },
  feeType: { key: 'fee_type_id', label: 'Fee Type', type: 'fee-type' },
  paymentMethod: { key: 'payment_method_id', label: 'Payment Method', type: 'payment-method' },
  bookCategory: { key: 'category_id', label: 'Category', type: 'book-category' },
  borrowStatus: {
    key: 'borrow_status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'issued', label: 'Issued' },
      { value: 'returned', label: 'Returned' },
      { value: 'overdue', label: 'Overdue' }
    ]
  },
  fineStatus: {
    key: 'fine_status',
    label: 'Fine Status',
    type: 'select',
    options: [
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'paid', label: 'Paid' },
      { value: 'waived', label: 'Waived' }
    ]
  }
};

/** Money is stored as plain numbers; render it consistently across reports. */
export const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * The client sends the examination scope as "period:<id>" / "exam:<id>"
 * (see useResultScope) — unpack it into the params the result service takes.
 */
export const parseExamScope = (filters = {}) => {
  const scope = filters.scope;
  if (typeof scope === 'string') {
    if (scope.startsWith('period:')) return { exam_period_id: scope.slice(7) };
    if (scope.startsWith('exam:')) return { exam_id: scope.slice(5) };
  }
  if (filters.exam_period_id) return { exam_period_id: filters.exam_period_id };
  if (filters.exam_id) return { exam_id: filters.exam_id };
  return {};
};

export const dateRange = (filters = {}) => {
  const range = {};
  if (filters.from) range.$gte = new Date(filters.from);
  if (filters.to) {
    const to = new Date(filters.to);
    to.setUTCHours(23, 59, 59, 999);
    range.$lte = to;
  }
  return Object.keys(range).length ? range : null;
};

/** Active students, optionally narrowed to a class/section — today's roster. */
export const activeStudentFilter = (filters = {}) => {
  const query = { isDeleted: { $ne: true } };
  if (filters.class_id) query.classId = filters.class_id;
  if (filters.section_id) query.sectionId = filters.section_id;
  return query;
};

/**
 * A student's `classId` on the Student document is their *current* class —
 * it moves every time they're promoted. A report scoped to a past academic
 * year ("Class 5, 2025") must not use it, or a student promoted to Class 6
 * in 2026 silently vanishes from — or worse, never appears in — the 2025
 * report it actually belongs in.
 *
 * `StudentClass` is the school's real enrolment ledger: one row per
 * student per year, written when the student is created (studentService.js)
 * and again on every promotion (promotionService.js). This resolves the
 * roster for a specific year from that ledger instead, shaped exactly like
 * a populated Student query (`classId: { _id, cl_name }`) so callers don't
 * need to special-case it.
 *
 * Returns null when no year_id filter is given — the signal to callers that
 * no historical scoping applies and they should query Student directly, for
 * "who is enrolled right now" reports.
 *
 * Section: since 2026-08-19 StudentClass stores `section` too, so a
 * year-scoped roster returns the student's section *in that year*, not the
 * live one. Rows written before that field existed have section=null and
 * fall back to the student's current section — the backfill script
 * `scripts/backfillStudentClassSections.js` fills those in from the current
 * Student.sectionId for legacy data.
 */
export const resolveHistoricalRoster = async (filters = {}) => {
  if (!filters.year_id) return null;

  const query = { year: filters.year_id };
  if (filters.class_id) query.class = filters.class_id;
  // filters.section_id narrows to a specific section within the historical
  // enrolment — same semantics as the live query above.
  if (filters.section_id) query.section = filters.section_id;

  const enrolments = await StudentClass.find(query)
    .populate({
      path: 'student',
      select: 'firstName lastName admissionNumber sectionId gender status admissionType createdAt birthDate isDeleted',
      populate: { path: 'sectionId', select: 'name' }
    })
    .populate('class', 'cl_name')
    .populate('section', 'name');

  return enrolments
    .filter((row) => row.student && !row.student.isDeleted)
    .map((row) => {
      const student = row.student.toObject();
      return {
        ...student,
        classId: row.class,
        // Prefer the section captured on the enrolment row (year-correct).
        // Fall back to the student's current section only when the historical
        // row was written before the field existed, or the student had no
        // section that year.
        sectionId: row.section ?? student.sectionId ?? null
      };
    })
    .sort((a, b) => (a.admissionNumber || '').localeCompare(b.admissionNumber || ''));
};

/**
 * Student ids matching a class/year filter — the id-only counterpart to
 * resolveHistoricalRoster, for callers (finance reports) that only need to
 * narrow a query to "these students," not display full student records.
 * Returns null under the same condition: no year_id, no historical scoping.
 */
export const resolveYearScopedStudentIds = async (filters = {}) => {
  if (!filters.year_id) return null;
  const query = { year: filters.year_id };
  if (filters.class_id) query.class = filters.class_id;
  const ids = await StudentClass.distinct('student', query);
  return ids.map((id) => String(id));
};

/**
 * Map of studentId (string) -> the Class they were enrolled in during a
 * specific year. For reports that GROUP records by class (not just filter
 * by it) — grouping by a student's *current* classId when reporting on a
 * past year doesn't just mislabel a column, it silently merges figures into
 * the wrong bucket. Returns null when no year_id filter is given, meaning
 * "group by each record's live class field as before."
 */
export const resolveHistoricalClassMap = async (filters = {}) => {
  if (!filters.year_id) return null;
  const enrolments = await StudentClass.find({ year: filters.year_id })
    .select('student class')
    .populate('class', 'cl_name');
  const map = new Map();
  for (const row of enrolments) {
    if (row.student && row.class) map.set(String(row.student), row.class);
  }
  return map;
};

export const findStudents = async (filters = {}, extra = {}) => {
  const historical = await resolveHistoricalRoster(filters);
  if (historical) {
    const extraEntries = Object.entries(extra);
    return historical.filter((student) => extraEntries.every(([key, value]) => student[key] === value));
  }

  return Student.find({ ...activeStudentFilter(filters), ...extra })
    .select('firstName lastName admissionNumber classId sectionId gender status admissionType createdAt birthDate')
    .populate('classId', 'cl_name')
    .populate('sectionId', 'name')
    .sort({ admissionNumber: 1 });
};

/**
 * The classes and subjects the authenticated teacher is responsible for.
 *
 * Every report in the teaching department runs inside this scope, so a teacher
 * can only ever see their own classes — there is no filter they can widen to
 * reach the rest of the school.
 */
export const resolveTeacherScope = async (user, filters = {}) => {
  // Academic staff may inspect a specific teacher's reports; a teacher always
  // gets their own, whatever teacher_id they send.
  const isTeacher = user.role === 'teacher';
  let teacher = null;

  if (isTeacher) {
    teacher = await Teacher.findOne({ userId: user._id });
    if (!teacher) {
      throw new ReportError('No teacher record is linked to this account', 404);
    }
  } else if (filters.teacher_id) {
    teacher = await Teacher.findById(filters.teacher_id);
    if (!teacher) throw new ReportError('Teacher not found', 404);
  }

  const query = teacher ? { teacherId: teacher._id } : {};
  const assignments = await TeacherAssignment.find(query)
    .populate('subjectId', 'sub_name sub_no')
    .populate('classId', 'cl_name cl_no')
    .populate('sectionId', 'name')
    .populate({
      path: 'termId',
      select: 'name academicYearId',
      populate: { path: 'academicYearId', select: 'y_name' }
    })
    .populate('timetableSlots.periodId', 'per_no per_name time_in time_out')
    .populate({
      path: 'teacherId',
      select: 'userId',
      populate: { path: 'userId', select: 'firstName lastName username' }
    });

  const classIds = [...new Set(assignments.map((a) => String(a.classId?._id)).filter(Boolean))];
  const subjectIds = [...new Set(assignments.map((a) => String(a.subjectId?._id)).filter(Boolean))];

  return { teacher, assignments, classIds, subjectIds, isTeacher };
};

/** Narrow a class filter to the teacher's own classes, never outside them. */
export const scopedClassIds = (scope, filters = {}) => {
  if (filters.class_id && scope.classIds.includes(String(filters.class_id))) {
    return [String(filters.class_id)];
  }
  return scope.classIds;
};

/** Marks submissions within a scope, with everything the reports display. */
export const findSubmissions = (query) =>
  ExamMarkSubmission.find(query)
    .populate({ path: 'exam_id', select: 'ex_name exam_date total_marks pass_marks exam_period_id' })
    .populate('class_id', 'cl_name')
    .populate('subject_id', 'sub_name')
    .populate({
      path: 'teacher',
      select: 'firstName lastName username'
    })
    .populate({ path: 'entries.student', select: 'firstName lastName admissionNumber' });

/** Uniform empty result — keeps a report's columns visible with no rows. */
export const emptyTable = (columns, summary = []) => ({ columns, rows: [], summary });
