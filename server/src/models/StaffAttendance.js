import mongoose from 'mongoose';

const staffAttendanceSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'Excused'], required: true },
  att_date: { type: Date, required: true },
  time_in: { type: String },
  time_out: { type: String },
  remarks: { type: String },
  createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

staffAttendanceSchema.index({ teacherId: 1, att_date: 1 }, { unique: true });

const StaffAttendance = mongoose.model('StaffAttendance', staffAttendanceSchema);
export default StaffAttendance;
