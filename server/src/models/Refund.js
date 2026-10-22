import mongoose from 'mongoose';

/**
 * A refund issued against a payment already recorded on `StudentFee`.
 *
 * Nothing in this codebase modeled refunds before this — there was no way to
 * record money handed back to a family, so a "Refunds" report had nothing to
 * read. This is the real ledger for that: it captures who authorised it, why,
 * how much, and which payment it reverses, and refundService applies the
 * matching adjustment back onto the StudentInvoice (paid_amount/balance/status)
 * the same way studentFeeController does for a deleted payment.
 */
const refundSchema = new mongoose.Schema({
  refund_no: {
    type: String,
    required: [true, 'Refund number is required'],
    unique: true,
    trim: true
  },
  // The payment being reversed. Refunding is scoped to a specific StudentFee
  // record rather than an invoice directly, so the amount can never exceed
  // what was actually paid in that one transaction.
  student_fee_no: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentFee',
    required: [true, 'The payment being refunded is required']
  },
  // Denormalised at creation time so the refund stays attributable even if the
  // underlying invoice is later edited or deleted.
  invoice_no: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentInvoice',
    required: [true, 'Invoice reference is required']
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  amount: {
    type: Number,
    required: [true, 'Refund amount is required'],
    min: [0.01, 'Refund amount must be greater than zero']
  },
  reason: {
    type: String,
    required: [true, 'A reason for the refund is required'],
    trim: true
  },
  payment_method_no: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentMethod'
  },
  status: {
    type: String,
    enum: ['issued', 'reversed'],
    default: 'issued'
  },
  // Who authorised it and when — the audit trail a refund report exists for.
  authorisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Refund must record who authorised it']
  },
  refundDate: {
    type: Date,
    default: Date.now
  },
  // Set only if the refund itself is later reversed (a correction), mirroring
  // status/updateBy/updateDate conventions used elsewhere in the fee ledger.
  updateBy: { type: String },
  updateDate: { type: Date }
}, { timestamps: true });

refundSchema.index({ student_fee_no: 1 });
refundSchema.index({ invoice_no: 1 });
refundSchema.index({ student: 1 });

const Refund = mongoose.model('Refund', refundSchema);
export default Refund;
