import mongoose from 'mongoose';

const scholarshipTypeSchema = new mongoose.Schema({
  schola_type_no: { type: String, required: true, unique: true },
  scholarship_name: { type: String, required: true },
  description: { type: String },
  registerDate: { type: Date, default: Date.now },
  registerBy: { type: String },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const ScholarshipType = mongoose.model('ScholarshipType', scholarshipTypeSchema);
export default ScholarshipType;
