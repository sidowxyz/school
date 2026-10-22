import mongoose from 'mongoose';

const attendanceStatusSchema = new mongoose.Schema({
  status_no: { type: String, required: true, unique: true },
  status_name: { type: String, required: true }
}, { timestamps: true });

const AttendanceStatus = mongoose.model('AttendanceStatus', attendanceStatusSchema);
export default AttendanceStatus;
