import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  sub_no:      { type: String, required: true, unique: true },
  sub_name:    { type: String, required: true },
  subjectCode: { type: String, unique: true, sparse: true },
  classId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;