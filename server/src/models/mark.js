import mongoose from 'mongoose';
import { calculateGrade } from '../utils/gradingEngine.js';

const markSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student', // Wuxuu ku xirmayaa Student model-kaaga
    required: [true, 'Ardaygu waa qasab']
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Maaddadu waa qasab']
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Year',
    required: [true, 'Sanad dugsiyeedku waa qasab']
  },
  term: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Term',
    required: [true, 'Xilligu (Term) waa qasab']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Macallinka dhibcaha geliya waa User leh role: 'teacher'
    required: [true, 'Macallinku waa qasab']
  },
  caMarks: {
    type: Number,
    required: [true, 'Dhibcaha Imtixaanka Dhexdeeda (CA) waa qasab'],
    min: [0, 'Dhibcuhu kama yarayn karaan 0'],
    max: [40, 'Dhibcaha CA kama badnaan karaan 40']
  },
  examMarks: {
    type: Number,
    required: [true, 'Dhibcaha Imtixaanka weyn waa qasab'],
    min: [0, 'Dhibcuhu kama yarayn karaan 0'],
    max: [60, 'Dhibcaha imtixaanadu kama badnaan karaan 60']
  },
  totalMarks: {
    type: Number
  },
  grade: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F'],
    default: 'F'
  },
  remarks: {
    type: String,
    enum: ['Excellent', 'Very Good', 'Good', 'Pass', 'Fair', 'Fail'],
    default: 'Fail'
  }
}, {
  timestamps: true
});

// 🛡️ AMNIGA XOGTA: Hal arday laguma celin karo dhibco isku maaddo ah, isku term iyo isku sannad dhexdiisa.
markSchema.index({ student: 1, subject: 1, term: 1, academicYear: 1 }, { unique: true });

// --- RESULT PROCESSING ENGINE ---
// Runs on validate (not save) so the computed grade is what gets validated against
// the enums above — otherwise a caller-supplied grade would be validated instead.
markSchema.pre('validate', function(next) {
  if (typeof this.caMarks !== 'number' || typeof this.examMarks !== 'number') {
    return next(); // let the `required` validators report the missing marks
  }

  this.totalMarks = this.caMarks + this.examMarks;

  const { grade, remarks } = calculateGrade(this.caMarks, this.examMarks);
  this.grade = grade;
  this.remarks = remarks;

  next();
});

const Mark = mongoose.model('Mark', markSchema);
export default Mark;