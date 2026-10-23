import mongoose from 'mongoose';

const feeStructureSchema = new mongoose.Schema({
  fee_struc_no: { type: String, required: true, unique: true },
  fee_type_no: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeType', required: true },
  lev_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Level', required: true },
  y_no: { type: mongoose.Schema.Types.ObjectId, ref: 'Year', required: true },
  amount: { type: Number, required: true, min: 0 },
  // A class's monthly fee is a FeeStructure with billing 'monthly' and a
  // class_id (one per class). Older level-wide structures stay 'once'.
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  billing: { type: String, enum: ['once', 'monthly'], default: 'once' },
  registerDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

// Unique per fee type, level and year — and per class for monthly class fees,
// so two classes in the same level can each have their own monthly fee.
// (Replaces an older index without class_id; see ensureFeeIndexes.)
feeStructureSchema.index({ fee_type_no: 1, lev_no: 1, y_no: 1, class_id: 1 }, { unique: true });

const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);
export default FeeStructure;
