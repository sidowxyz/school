import mongoose from 'mongoose';

const lessonCoverageSchema = new mongoose.Schema({
  lc_no: { type: String, required: true, unique: true }, // primary key
  syllabus_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Syllabus', required: true },
  cc_no: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseClass', required: true },
  date_covered: { type: Date },
  periods_covered: { type: Number },
  remarks: { type: String },
  createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createDate: { type: Date, default: Date.now },
  updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updateDate: { type: Date }
}, { timestamps: true });

const LessonCoverage = mongoose.model('LessonCoverage', lessonCoverageSchema);
export default LessonCoverage;
