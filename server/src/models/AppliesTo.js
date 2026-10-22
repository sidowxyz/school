import mongoose from 'mongoose';

const appliesToSchema = new mongoose.Schema({
  applies_to_id: { type: String, required: true, unique: true },
  applies_to_name: { type: String, required: true },
  description: { type: String },
  registerDate: { type: Date, default: Date.now },
  registerBy: { type: String },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const AppliesTo = mongoose.model('AppliesTo', appliesToSchema);
export default AppliesTo;
