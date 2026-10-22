import mongoose from 'mongoose';

const teachingLogSchema = new mongoose.Schema({
  logNo: {
    type: String,
    required: true,
    unique: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  // References preserve the exact academic-structure records selected while
  // the text fields below remain snapshots for readable historical reports.
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherAssignment' },
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period' },
  date:    { type: Date,   required: true },
  subject: { type: String, required: true },
  classId: { type: String, required: true },
  section: { type: String, required: true },
  period:  { type: String, required: true },

  topicTaught:      { type: String, required: true },
  lessonObjective:  { type: String, required: true },
  teachingSummary:  { type: String, required: true },
  learningOutcomes: { type: String, required: true },

  studentParticipation: { type: String },
  challengesFaced:      { type: String },
  extraNotes:           { type: String },

  homeworkGiven:      { type: String },
  submissionDeadline: { type: Date },

  status: {
    type: String,
    enum: ['draft', 'completed'],
    default: 'draft'
  }
}, { timestamps: true });

// Prevent the same teacher logging the same class/period twice on the same date
teachingLogSchema.index(
  { teacherId: 1, classId: 1, period: 1, date: 1 },
  { unique: true }
);

teachingLogSchema.index(
  { teacherId: 1, assignmentId: 1, periodId: 1, date: 1 },
  { unique: true, partialFilterExpression: { assignmentId: { $exists: true }, periodId: { $exists: true } } }
);

const TeachingLog = mongoose.model('TeachingLog', teachingLogSchema);
export default TeachingLog;
