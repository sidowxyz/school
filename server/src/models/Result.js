import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  res_no: {
    type: String,
    required: [true, 'Result number is required'],
    unique: true,
    trim: true
  },
  ex_r_no: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamReg',
    required: [true, 'ExamReg reference is required']
  },
  cc_no: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseClass',
    required: [true, 'CourseClass reference is required']
  },
  id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  marks: {
    type: Number,
    min: [0, 'Marks cannot be negative']
  },
  grade: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
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

const Result = mongoose.model('Result', resultSchema);
export default Result;
