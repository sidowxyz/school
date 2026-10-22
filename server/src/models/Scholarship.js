import mongoose from 'mongoose';

const scholarshipSchema = new mongoose.Schema({
  scholarship_id: { type: String, required: true, unique: true },
  scholar_type_no: { type: mongoose.Schema.Types.ObjectId, ref: 'ScholarshipType', required: true },
  discount_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscountType', required: true },
  discount_value: { type: Number, required: true },
  description: { type: String },
  is_active: { type: Boolean, default: true },
  registerDate: { type: Date, default: Date.now },
  registerBy: { type: String },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const Scholarship = mongoose.model('Scholarship', scholarshipSchema);
export default Scholarship;
