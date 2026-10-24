import mongoose from 'mongoose';

// One assessment the school runs in a term, e.g. "Midterm" or "Final exam".
// Teachers enter a mark per student and subject (see Mark). Students and
// parents only see an exam's marks once it is published.
const examSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  termId: { type: mongoose.Schema.Types.ObjectId, ref: 'Term', required: true },
  yearId: { type: mongoose.Schema.Types.ObjectId, ref: 'Year', required: true },
  // Every subject in this exam is marked out of this.
  maxMarks: { type: Number, required: true, min: 1, max: 1000, default: 100 },
  date: { type: Date, default: null },
  // Classes sitting the exam; empty means every class.
  classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  published: { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

examSchema.index({ termId: 1, name: 1 }, { unique: true });

const Exam = mongoose.model('Exam', examSchema);
export default Exam;
