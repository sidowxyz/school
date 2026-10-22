import mongoose from 'mongoose';

const studentAttendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'Excused'], required: true },
  att_date: { type: Date, required: true },
  remarks: { type: String },
  createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

studentAttendanceSchema.index({ studentId: 1, periodId: 1, att_date: 1 }, { unique: true });

const StudentAttendance = mongoose.model('StudentAttendance', studentAttendanceSchema);
export default StudentAttendance;
