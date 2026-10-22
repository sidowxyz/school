import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  ex_no: {
    type: String,
    required: [true, 'Exam number is required'],
    unique: true,
    trim: true
  },
  ex_name: {
    type: String,
    required: [true, 'Exam name is required'],
    trim: true
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  section_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  academic_year_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Year'
  },
  term_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Term'
  },
  // Set when the exam is scheduled as part of a published examination
  // timetable; standalone exams created outside a period leave it unset.
  exam_period_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamPeriod'
  },
  exam_type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamType',
    required: [true, 'Exam type is required']
  },
  // Set only when created via bulk (multi-grade) creation — groups the
  // fanned-out per-class Exam records so the UI can display/manage them
  // as a single action.
  batch_id: {
    type: String
  },
  total_marks: {
    type: Number,
    required: [true, 'Total marks is required'],
    min: [0, 'Total marks cannot be negative']
  },
  pass_marks: {
    type: Number,
    required: [true, 'Pass marks is required'],
    min: [0, 'Pass marks cannot be negative']
  },
  exam_date: {
    type: Date,
    required: [true, 'Exam date is required']
  },
  start_time: {
    type: String,
    required: [true, 'Start time is required']
  },
  end_time: {
    type: String,
    required: [true, 'End time is required']
  },
  // Kept alongside end_time rather than derived on read: duration is what
  // academic staff actually configure ("Mathematics: 2 hours"), and storing
  // it means end_time can be recomputed whenever the start time moves.
  duration_minutes: {
    type: Number,
    min: [1, 'Duration must be at least 1 minute']
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed'],
    default: 'scheduled'
  },
  createBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createDate: {
    type: Date,
    default: Date.now
  },
  updateBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updateDate: {
    type: Date
  }
}, { timestamps: true });

// The client reads `name`; ex_name stays the source of truth so existing
// readers (analyticsController, studentPortalController populate/select)
// keep working unchanged.
examSchema.virtual('name')
  .get(function () { return this.ex_name; })
  .set(function (value) { this.ex_name = value; });
examSchema.set('toJSON', { virtuals: true });
examSchema.set('toObject', { virtuals: true });

const Exam = mongoose.model('Exam', examSchema);
export default Exam;