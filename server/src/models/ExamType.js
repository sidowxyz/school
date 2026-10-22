import mongoose from 'mongoose';

const examTypeSchema = new mongoose.Schema({
  exam_type_no: { type: String, required: true, unique: true },
  type_name: { type: String, required: true },
  registerDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const ExamType = mongoose.model('ExamType', examTypeSchema);
export default ExamType;
