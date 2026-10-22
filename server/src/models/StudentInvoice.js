import mongoose from 'mongoose';

const studentInvoiceSchema = new mongoose.Schema({
  invoice_no: { type: String, required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  fee_struc_no: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
  invoice_amount: { type: Number, required: true, min: 0 },
  paid_amount: { type: Number, required: true, default: 0, min: 0 },
  balance: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['Unpaid', 'Partially_Paid', 'Paid'],
    default: 'Unpaid'
  },
  // Pre-discount amount, and the sibling/scholarship discount applied on top of
  // it to arrive at invoice_amount. Both default to 0 so existing invoices
  // (created before this field existed) read as "no discount" rather than null.
  original_amount: { type: Number, min: 0 },
  discount_percentage: { type: Number, min: 0, max: 100, default: 0 },
  discount_amount: { type: Number, min: 0, default: 0 },
  dueDate: { type: Date },
  registerDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

const StudentInvoice = mongoose.model('StudentInvoice', studentInvoiceSchema);
export default StudentInvoice;
