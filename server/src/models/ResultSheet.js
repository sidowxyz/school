import mongoose from 'mongoose';

const resultSheetSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseClass', required: true },
  examReg: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamReg', required: true },
  marks: [{
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    score: { type: Number, required: true, min: 0 }
  }],
  overallScore: { type: Number, min: 0 },
}, { timestamps: true });

// Pre-save hook to calculate overallScore as average of marks
resultSheetSchema.pre('save', function (next) {
  if (this.marks && this.marks.length) {
    const sum = this.marks.reduce((acc, m) => acc + m.score, 0);
    this.overallScore = sum / this.marks.length;
  }
  next();
});

const ResultSheet = mongoose.model('ResultSheet', resultSheetSchema);
export default ResultSheet;
