import mongoose from 'mongoose';

const courseClassSchema = new mongoose.Schema({
  cc_no: { type: String, required: true, unique: true },
  stf_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  cl_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  sub_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  y_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Year', required: true },
  no_periods: { type: Number, required: true },
  createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createDate: { type: Date, default: Date.now },
  updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updateDate: { type: Date }
}, { timestamps: true });

const CourseClass = mongoose.model('CourseClass', courseClassSchema);
export default CourseClass;
