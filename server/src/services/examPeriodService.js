import ExamPeriod from '../models/ExamPeriod.js';
import Exam from '../models/Exam.js';

const POPULATE = [
  { path: 'academic_year_id', select: 'y_name' },
  { path: 'term_id', select: 'name' },
  { path: 'createBy', select: 'username' },
  { path: 'updateBy', select: 'username' }
];

/** Exams scheduled outside [start_date, end_date] — blocks publishing. */
const findOutOfRangeExams = async (period) => {
  const start = new Date(period.start_date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(period.end_date);
  end.setUTCHours(23, 59, 59, 999);

  return Exam.find({
    exam_period_id: period._id,
    $or: [{ exam_date: { $lt: start } }, { exam_date: { $gt: end } }]
  }).populate([
    { path: 'class_id', select: 'cl_name' },
    { path: 'subject_id', select: 'sub_name' }
  ]);
};

export const createExamPeriod = async (data) => {
  const period = await ExamPeriod.create(data);
  return period.populate(POPULATE);
};

export const getAllExamPeriods = async (query = {}) => {
  const { status, academic_year_id, term_id } = query;
  const filter = {};
  if (status) filter.status = status;
  if (academic_year_id) filter.academic_year_id = academic_year_id;
  if (term_id) filter.term_id = term_id;

  const periods = await ExamPeriod.find(filter).populate(POPULATE).sort({ start_date: -1 });

  // The timetable views lead with "how many exams are scheduled", so count
  // them here rather than making the client fetch every exam per period.
  const counts = await Exam.aggregate([
    { $match: { exam_period_id: { $in: periods.map((p) => p._id) } } },
    { $group: { _id: '$exam_period_id', count: { $sum: 1 } } }
  ]);
  const countBy = new Map(counts.map((c) => [String(c._id), c.count]));

  return periods.map((p) => ({
    ...p.toObject({ virtuals: true }),
    exam_count: countBy.get(String(p._id)) ?? 0
  }));
};

export const getExamPeriodById = async (id) => {
  return ExamPeriod.findById(id).populate(POPULATE);
};

export const updateExamPeriod = async (id, data) => {
  const period = await ExamPeriod.findById(id);
  if (!period) return null;

  Object.assign(period, data);
  await period.save(); // save (not findByIdAndUpdate) so the date-order check runs
  return period.populate(POPULATE);
};

export const deleteExamPeriod = async (id) => {
  const scheduled = await Exam.countDocuments({ exam_period_id: id });
  if (scheduled > 0) {
    const error = new Error(
      `This examination period still has ${scheduled} scheduled examination(s). Remove or reassign them first.`
    );
    error.status = 409;
    throw error;
  }
  return ExamPeriod.findByIdAndDelete(id);
};

/**
 * Publish the timetable for a period. Refuses when it holds no exams, or
 * when any exam falls outside the period's own date range — publishing a
 * timetable people plan around should not hand them a broken one.
 */
export const publishExamPeriod = async (id, updateBy) => {
  const period = await ExamPeriod.findById(id);
  if (!period) return null;

  const scheduled = await Exam.countDocuments({ exam_period_id: id });
  if (scheduled === 0) {
    const error = new Error('Add at least one examination to the timetable before publishing it');
    error.status = 400;
    throw error;
  }

  const outOfRange = await findOutOfRangeExams(period);
  if (outOfRange.length) {
    const error = new Error(
      `${outOfRange.length} examination(s) fall outside the examination period. Fix their dates before publishing.`
    );
    error.status = 400;
    error.details = outOfRange;
    throw error;
  }

  period.status = 'published';
  period.publishedAt = new Date();
  if (updateBy) period.updateBy = updateBy;
  await period.save();
  return period.populate(POPULATE);
};

/** Pull a published timetable back to draft so it can be edited again. */
export const unpublishExamPeriod = async (id, updateBy) => {
  const period = await ExamPeriod.findById(id);
  if (!period) return null;
  period.status = 'draft';
  period.publishedAt = undefined;
  if (updateBy) period.updateBy = updateBy;
  await period.save();
  return period.populate(POPULATE);
};
