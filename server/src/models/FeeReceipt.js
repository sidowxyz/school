import mongoose from 'mongoose';

// One counter payment: a parent may pay for several siblings and several
// months at once. Each line is also recorded as a StudentFee against its
// invoice (so balances, the ledger and the portals stay in step); this groups
// them under the single receipt the family takes home.
const feeReceiptSchema = new mongoose.Schema({
  receipt_no: { type: String, required: true, unique: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  payer_name: { type: String, trim: true },
  payer_phone: { type: String, trim: true },
  lines: [{
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentInvoice', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    student_fee: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentFee', required: true },
    period: { type: String },
    description: { type: String },
    amount: { type: Number, required: true, min: 0 },
    balance_after: { type: Number, min: 0 }
  }],
  total: { type: Number, required: true, min: 0 },
  payment_method: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentMethod', required: true },
  reference: { type: String, trim: true },
  note: { type: String, trim: true },
  received_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  received_by_name: { type: String },
  received_at: { type: Date, default: Date.now }
}, { timestamps: true });

feeReceiptSchema.index({ students: 1, received_at: -1 });
feeReceiptSchema.index({ received_at: -1 });

const FeeReceipt = mongoose.model('FeeReceipt', feeReceiptSchema);
export default FeeReceipt;
