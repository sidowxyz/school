import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  payment_id: { type: String, required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  fee_structure: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure' },
  payment_type: { type: String },
  payment_method: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod' },
  amount_paid: { type: Number, required: true, min: 0 },
  remaining_balance: { type: Number, min: 0 },
  status: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
  payment_date: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
