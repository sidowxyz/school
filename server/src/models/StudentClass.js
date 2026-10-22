import mongoose from 'mongoose';

const studentClassSchema = new mongoose.Schema({
  sc_no: { type: String, required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  // Optional: classes without sections leave this null. When set, year-scoped
  // reports (see reports/helpers.js#resolveHistoricalRoster) prefer this
  // stored value over the student's current sectionId, which is the whole
  // point of the enrolment ledger — Student.sectionId moves on every
  // promotion, this doesn't.
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
  year: { type: mongoose.Schema.Types.ObjectId, ref: 'Year', required: true }
}, { timestamps: true });

const StudentClass = mongoose.model('StudentClass', studentClassSchema);
export default StudentClass;
// Student management module - Gabaxey