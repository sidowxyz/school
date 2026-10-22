import mongoose from 'mongoose';

const feeTypeSchema = new mongoose.Schema({
  fee_type_no: { type: String, required: true, unique: true },
  fee_name: { type: String, required: true },
  registerDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const FeeType = mongoose.model('FeeType', feeTypeSchema);
export default FeeType;
