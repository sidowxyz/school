import mongoose from 'mongoose';

const discountTypeSchema = new mongoose.Schema({
  discount_type_id: { type: String, required: true, unique: true },
  discount_type_name: { type: String, required: true },
  description: { type: String },
  registerDate: { type: Date, default: Date.now },
  registerBy: { type: String },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const DiscountType = mongoose.model('DiscountType', discountTypeSchema);
export default DiscountType;
