import mongoose from 'mongoose';

// A student's mark for one subject in one exam. The class and section are kept
// as they were when the mark was entered, so results stay correct after the
// student moves class or is promoted.
const markSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  // null with absent=false means "not marked yet"; absent counts as 0.
  score: { type: Number, min: 0, default: null },
  absent: { type: Boolean, default: false },
  remark: { type: String, trim: true, maxlength: 200, default: '' },
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

markSchema.index({ examId: 1, studentId: 1, subjectId: 1 }, { unique: true });
markSchema.index({ examId: 1, classId: 1, sectionId: 1, subjectId: 1 });
markSchema.index({ studentId: 1 });

const Mark = mongoose.model('Mark', markSchema);
export default Mark;
