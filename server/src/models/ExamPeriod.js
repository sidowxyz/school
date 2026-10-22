import mongoose from 'mongoose';

/**
 * The window academic staff set aside for a round of examinations
 * ("Term 1 Examinations, 1–15 September 2026"). Individual Exam records
 * point at it via exam_period_id; together they form the examination
 * timetable, which is what gets published to the rest of the school.
 */
const examPeriodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Examination period name is required'],
    trim: true
  },
  academic_year_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Year'
  },
  term_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Term'
  },
  start_date: {
    type: Date,
    required: [true, 'Examination period start date is required']
  },
  end_date: {
    type: Date,
    required: [true, 'Examination period end date is required']
  },
  description: {
    type: String,
    trim: true
  },
  // draft  — staff are still building the timetable
  // published — visible to teachers, students and parents
  // closed — the period is over and the timetable is archived
  status: {
    type: String,
    enum: ['draft', 'published', 'closed'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  createBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updateBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

examPeriodSchema.pre('validate', function (next) {
  if (this.start_date && this.end_date && this.end_date < this.start_date) {
    return next(new Error('Examination period end date cannot be before its start date'));
  }
  next();
});

examPeriodSchema.index({ start_date: 1 });

const ExamPeriod = mongoose.model('ExamPeriod', examPeriodSchema);
export default ExamPeriod;
