import mongoose from 'mongoose';

/**
 * A teacher's marks for one Exam × Class × Subject, plus the review workflow
 * that carries those marks through to published results.
 *
 * This is deliberately keyed to an actual Exam record (unlike the older
 * Mark model, which is keyed to term/year and has no exam reference), so
 * everything the Results section displays traces back to a real examination,
 * a real class, a real subject and real students.
 */
const entrySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  // null means "not marked yet" — distinct from a score of 0.
  marks: {
    type: Number,
    default: null,
    min: [0, 'Marks cannot be negative']
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const examMarkSubmissionSchema = new mongoose.Schema({
  exam_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam is required']
  },
  class_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class is required']
  },
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject is required']
  },
  section_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Snapshotted from the exam so historical submissions keep the scale they
  // were marked against even if the exam's total_marks is later edited.
  max_marks: {
    type: Number,
    required: true,
    min: [1, 'Maximum marks must be at least 1']
  },
  pass_marks: {
    type: Number,
    min: [0, 'Pass marks cannot be negative']
  },
  entries: {
    type: [entrySchema],
    default: []
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'returned', 'published'],
    default: 'draft'
  },
  submittedAt: { type: Date },
  reviewedAt: { type: Date },
  publishedAt: { type: Date },
  returnReason: { type: String, trim: true },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// One submission per exam/class/subject/section — re-entering marks updates
// the existing record rather than creating a competing one.
examMarkSubmissionSchema.index(
  { exam_id: 1, class_id: 1, subject_id: 1, section_id: 1 },
  { unique: true }
);

const ExamMarkSubmission = mongoose.model('ExamMarkSubmission', examMarkSubmissionSchema);
export default ExamMarkSubmission;
