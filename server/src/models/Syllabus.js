import mongoose from 'mongoose';

const syllabusSchema = new mongoose.Schema({
  syllabus_no: { type: String, required: true, unique: true }, // primary key
  sub_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  topic: { type: String },
  chapter: { type: String },
  createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createDate: { type: Date, default: Date.now },
  updateBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updateDate: { type: Date }
}, { timestamps: true });

const Syllabus = mongoose.model('Syllabus', syllabusSchema);
export default Syllabus;
