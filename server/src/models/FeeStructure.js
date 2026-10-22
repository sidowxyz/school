import mongoose from 'mongoose';

const feeStructureSchema = new mongoose.Schema({
  fee_struc_no: { type: String, required: true, unique: true },
  fee_type_no: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeType', required: true },
  lev_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
  y_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Year', required: true },
  amount: { type: Number, required: true, min: 0 },
  registerDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

// Ensure unique combination of fee type, level, and year
feeStructureSchema.index({ fee_type_no: 1, lev_no: 1, y_no: 1 }, { unique: true });

const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);
export default FeeStructure;
