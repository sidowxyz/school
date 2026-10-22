import mongoose from 'mongoose';

const studentScholarshipSchema = new mongoose.Schema({
  student_scholarship_id: { type: String, required: true, unique: true },
  st_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  scholarship_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Scholarship' }, // Optional
  rule_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SiblingRule' }, // Optional
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Status', required: true }, // References Status model
  remarks: { type: String },
  registerDate: { type: Date, default: Date.now },
  registerBy: { type: String },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const StudentScholarship = mongoose.model('StudentScholarship', studentScholarshipSchema);
export default StudentScholarship;
