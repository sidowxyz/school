import mongoose from 'mongoose';

const examRegSchema = new mongoose.Schema({
  ex_r_no: {
    type: String,
    required: [true, 'ExamReg number is required'],
    unique: true,
    trim: true
  },
  ex_no: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam reference is required']
  },
  y_no: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Year',
    required: [true, 'Year reference is required']
  },
  started: {
    type: Date
  },
  ended: {
    type: Date
  },
  total_marks: {
    type: Number,
    min: [0, 'Total marks cannot be negative']
  },
  createBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createDate: {
    type: Date,
    default: Date.now
  },
  updateBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updateDate: {
    type: Date
  }
}, { timestamps: true });

const ExamReg = mongoose.model('ExamReg', examRegSchema);
export default ExamReg;
