import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema({
  payment_method_no: { type: String, required: true, unique: true },
  payment_method_name: { type: String, required: true },
  registerDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);
export default PaymentMethod;
