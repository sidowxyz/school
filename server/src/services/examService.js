import Exam from '../models/Exam.js';
import Counter from '../models/Counter.js';
import { resolveSchedule, timesOverlap, dayKey } from '../utils/examTime.js';

// Auto-generates EX-<year>-<seq> when the caller doesn't supply ex_no, using
// the same atomic per-year Counter pattern as admission numbers
// (studentService.js) and invoice numbers (studentInvoiceController.js).
const generateExamNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `EX-${year}-${String(counter.seq).padStart(4, '0')}`;
};

const POPULATE = [
  { path: 'createBy', select: 'username' },
  { path: 'updateBy', select: 'username' },
  { path: 'class_id', select: 'cl_name cl_no' },
  { path: 'subject_id', select: 'sub_name sub_no' },
  { path: 'section_id', select: 'name' },
  { path: 'exam_type', select: 'type_name exam_type_no' },
  { path: 'exam_period_id', select: 'name start_date end_date status' },
  { path: 'academic_year_id', select: 'y_name y_no' },
  { path: 'term_id', select: 'name' }
];

/** Error carrying a 409 so the controller can distinguish it from a 400. */
export class ScheduleConflictError extends Error {
  constructor(conflicts) {
    super('This examination clashes with an already scheduled examination');
    this.name = 'ScheduleConflictError';
    this.status = 409;
    this.conflicts = conflicts;
  }
}

/**
 * Exams that would clash with `candidate`: same class, same calendar day,
 * overlapping time window. A section-specific exam only clashes with exams
 * for the same section (or with a whole-class exam, which covers it).
 */
export const findScheduleConflicts = async (candidate, excludeId = null) => {
  const { class_id, section_id, exam_date, start_time, end_time } = candidate;
  if (!class_id || !exam_date || !start_time || !end_time) return [];

  const day = new Date(exam_date);
  const dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const sameDay = await Exam.find({
    class_id,
    exam_date: { $gte: dayStart, $lt: dayEnd },
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  }).populate(POPULATE);

  const candidateSection = section_id ? String(section_id) : null;

  return sameDay.filter((other) => {
    const otherSection = other.section_id ? String(other.section_id._id ?? other.section_id) : null;
    // Whole-class exams (no section) cover every section, so they always clash.
    if (candidateSection && otherSection && candidateSection !== otherSection) return false;
    return timesOverlap(start_time, end_time, other.start_time, other.end_time);
  });
};

/**
 * Normalise the schedule fields of a payload, deriving whichever of
 * end_time / duration_minutes was omitted. `existing` supplies the stored
 * values so a partial update is validated against the whole record.
 */
const applySchedule = (data, existing = null) => {
  const touchesSchedule =
    data.start_time !== undefined ||
    data.end_time !== undefined ||
    data.duration_minutes !== undefined;

  if (!touchesSchedule) return data;

  const start_time = data.start_time ?? existing?.start_time;
  // A caller that moves the start time or sets a new duration means the
  // stored end_time is stale, so only fall back to it when neither changed.
  const duration_minutes =
    data.duration_minutes ??
    (data.end_time !== undefined ? undefined : existing?.duration_minutes);
  const end_time = data.end_time ?? (duration_minutes ? undefined : existing?.end_time);

  return { ...data, ...resolveSchedule({ start_time, end_time, duration_minutes }) };
};

/** Reject pass_marks > total_marks once the payload is merged with the record. */
const assertMarks = (data, existing = null) => {
  const total = data.total_marks ?? existing?.total_marks;
  const pass = data.pass_marks ?? existing?.pass_marks;
  if (total !== undefined && pass !== undefined && Number(pass) > Number(total)) {
    throw new Error('Pass marks cannot be greater than total marks');
  }
};

/**
 * Create a new Exam
 */
export const createExam = async (data, { allowConflicts = false } = {}) => {
  const scheduled = applySchedule(data);
  assertMarks(scheduled);

  if (!allowConflicts) {
    const conflicts = await findScheduleConflicts(scheduled);
    if (conflicts.length) throw new ScheduleConflictError(conflicts);
  }

  const examData = {
    ...scheduled,
    ex_no: scheduled.ex_no || await generateExamNumber(),
    ex_name: scheduled.ex_name || scheduled.name
  };
  const exam = await Exam.create(examData);
  return exam.populate(POPULATE);
};

/**
 * Create one Exam per class in class_ids, all sharing a generated batch_id
 * — the "one exam across multiple grades" flow.
 */
export const createBulkExams = async (data, createBy, { allowConflicts = false } = {}) => {
  const { class_ids, ...rest } = data;
  const shared = applySchedule(rest);
  assertMarks(shared);
  const batch_id = `BATCH-${Date.now()}`;

  if (!allowConflicts) {
    const conflicts = [];
    for (const class_id of class_ids) {
      conflicts.push(...await findScheduleConflicts({ ...shared, class_id }));
    }
    if (conflicts.length) throw new ScheduleConflictError(conflicts);
  }

  for (const class_id of class_ids) {
    await Exam.create({
      ...shared,
      class_id,
      batch_id,
      createBy,
      ex_no: await generateExamNumber(),
      ex_name: shared.ex_name || shared.name
    });
  }

  return Exam.find({ batch_id }).populate(POPULATE);
};

/**
 * Get all Exams with optional filtering
 */
export const getAllExams = async (query = {}) => {
  const {
    ex_name,
    class_id,
    subject_id,
    exam_type,
    exam_period_id,
    term_id,
    academic_year_id,
    from,
    to,
    page = 1,
    limit = 20
  } = query;
  const filter = {};

  if (ex_name) {
    filter.ex_name = { $regex: ex_name, $options: 'i' };
  }
  if (class_id) filter.class_id = class_id;
  if (subject_id) filter.subject_id = subject_id;
  if (exam_type) filter.exam_type = exam_type;
  if (exam_period_id) filter.exam_period_id = exam_period_id;
  if (term_id) filter.term_id = term_id;
  if (academic_year_id) filter.academic_year_id = academic_year_id;
  if (from || to) {
    filter.exam_date = {};
    if (from) filter.exam_date.$gte = new Date(from);
    if (to) filter.exam_date.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Exam.countDocuments(filter);
  const exams = await Exam.find(filter)
    .populate(POPULATE)
    .sort({ exam_date: 1, start_time: 1 })
    .skip(skip)
    .limit(Number(limit));

  return { total, page: Number(page), limit: Number(limit), exams };
};

/**
 * Get a single Exam by MongoDB _id
 */
export const getExamById = async (id) => {
  return await Exam.findById(id).populate(POPULATE);
};

/**
 * Update an Exam by MongoDB _id
 */
export const updateExam = async (id, data, { allowConflicts = false } = {}) => {
  const existing = await Exam.findById(id);
  if (!existing) return null;

  const scheduled = applySchedule(data, existing);
  assertMarks(scheduled, existing);

  if (!allowConflicts) {
    // `??` would treat an explicit null (clearing the section restriction) as
    // "unchanged", so fall back only for fields the caller left out entirely.
    const merged = (key) => (scheduled[key] === undefined ? existing[key] : scheduled[key]);
    const candidate = {
      class_id: merged('class_id'),
      section_id: merged('section_id'),
      exam_date: merged('exam_date'),
      start_time: merged('start_time'),
      end_time: merged('end_time')
    };
    const conflicts = await findScheduleConflicts(candidate, id);
    if (conflicts.length) throw new ScheduleConflictError(conflicts);
  }

  const updateData = { ...scheduled, updateDate: new Date() };
  if (!updateData.ex_name && updateData.name) updateData.ex_name = updateData.name;

  // Explicit nulls detach an optional reference rather than storing null.
  const unset = {};
  for (const key of ['subject_id', 'section_id', 'term_id', 'academic_year_id', 'exam_period_id']) {
    if (updateData[key] === null) {
      unset[key] = '';
      delete updateData[key];
    }
  }

  return await Exam.findByIdAndUpdate(
    id,
    Object.keys(unset).length ? { $set: updateData, $unset: unset } : updateData,
    { new: true, runValidators: true }
  ).populate(POPULATE);
};

/**
 * Update all exams sharing a batch_id, updating shared properties
 * and syncing class assignments if class_ids is provided.
 */
export const updateBulkExams = async (batchId, data, updateBy) => {
  const { class_ids, name, ...shared } = data;
  const updateFields = {
    ...shared,
    updateDate: new Date()
  };
  if (updateBy) updateFields.updateBy = updateBy;
  if (name) updateFields.ex_name = name;
  if (shared.ex_name) updateFields.ex_name = shared.ex_name;

  if (class_ids && Array.isArray(class_ids) && class_ids.length > 0) {
    const existingExams = await Exam.find({ batch_id: batchId });
    const existingClassMap = new Map();
    for (const ex of existingExams) {
      existingClassMap.set(ex.class_id.toString(), ex);
    }

    const targetClassIds = new Set(class_ids.map(id => id.toString()));

    // Delete exams for classes no longer selected
    for (const [classIdStr, ex] of existingClassMap.entries()) {
      if (!targetClassIds.has(classIdStr)) {
        await Exam.findByIdAndDelete(ex._id);
      }
    }

    // Add new exams for newly selected classes
    for (const classIdStr of targetClassIds) {
      if (!existingClassMap.has(classIdStr)) {
        const sampleExam = existingExams[0] || {};
        await Exam.create({
          ...sampleExam.toObject?.() || {},
          _id: undefined,
          ...updateFields,
          class_id: classIdStr,
          batch_id: batchId,
          ex_no: await generateExamNumber(),
          createBy: updateBy || sampleExam.createBy
        });
      }
    }
  }

  // Update all remaining exams in the batch with updateFields
  await Exam.updateMany({ batch_id: batchId }, { $set: updateFields });

  return Exam.find({ batch_id: batchId }).populate(POPULATE);
};

/**
 * Delete an Exam by MongoDB _id
 */
export const deleteExam = async (id) => {
  return await Exam.findByIdAndDelete(id);
};

/**
 * Exams within an examination period, shaped for the timetable views —
 * flat rows the client groups by class or by subject.
 */
export const getTimetable = async ({ exam_period_id, class_id, subject_id, from, to }) => {
  const filter = {};
  if (exam_period_id) filter.exam_period_id = exam_period_id;
  if (class_id) filter.class_id = class_id;
  if (subject_id) filter.subject_id = subject_id;
  if (from || to) {
    filter.exam_date = {};
    if (from) filter.exam_date.$gte = new Date(from);
    if (to) filter.exam_date.$lte = new Date(to);
  }

  const exams = await Exam.find(filter)
    .populate(POPULATE)
    .sort({ exam_date: 1, start_time: 1 });

  // Flag rows that clash so the timetable can warn without a second request.
  const conflictIds = new Set();
  for (let i = 0; i < exams.length; i += 1) {
    for (let j = i + 1; j < exams.length; j += 1) {
      const a = exams[i];
      const b = exams[j];
      if (String(a.class_id?._id ?? a.class_id) !== String(b.class_id?._id ?? b.class_id)) continue;
      if (dayKey(a.exam_date) !== dayKey(b.exam_date)) continue;
      if (!timesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) continue;
      conflictIds.add(String(a._id));
      conflictIds.add(String(b._id));
    }
  }

  return {
    total: exams.length,
    conflicts: Array.from(conflictIds),
    exams
  };
};

/**
 * Delete all Exams sharing a batch_id
 */
export const deleteBulkExams = async (batchId) => {
  return await Exam.deleteMany({ batch_id: batchId });
};
