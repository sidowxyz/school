import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  // The teacher who acts as this section's class advisor/homeroom teacher.
  classTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null }
}, { timestamps: true });

const Section = mongoose.model('Section', sectionSchema);
export default Section;
