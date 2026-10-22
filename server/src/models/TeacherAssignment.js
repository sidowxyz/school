import mongoose from 'mongoose';

const teacherAssignmentSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true,
  },
  termId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Term',
    required: true,
  },
  timetableSlots: [{
    day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period' },
  }],
}, { timestamps: true });

// Prevent duplicate assignment of the same subject/class/section to the same teacher within a term
teacherAssignmentSchema.index(
  { teacherId: 1, subjectId: 1, classId: 1, sectionId: 1, termId: 1 },
  { unique: true }
);

const TeacherAssignment = mongoose.model('TeacherAssignment', teacherAssignmentSchema);
export default TeacherAssignment;
