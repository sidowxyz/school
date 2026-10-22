import mongoose from 'mongoose';

const siblingRuleSchema = new mongoose.Schema({
  rule_id: { type: String, required: true, unique: true },
  rule_name: { type: String, required: true },
  minimum_siblings: { type: Number, required: true },
  discount_percentage: { type: Number, required: true },
  applies_to_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AppliesTo', required: true },
  description: { type: String },
  is_active: { type: Boolean, default: true },
  registerDate: { type: Date, default: Date.now },
  registerBy: { type: String },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const SiblingRule = mongoose.model('SiblingRule', siblingRuleSchema);
export default SiblingRule;
