import Refund from '../models/Refund.js';
import StudentFee from '../models/StudentFee.js';
import StudentInvoice from '../models/StudentInvoice.js';
import Counter from '../models/Counter.js';

/** REF-<year>-<seq>, via the same atomic per-year Counter every other document number in this app uses. */
const generateRefundNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `REF-${year}-${String(counter.seq).padStart(4, '0')}`;
};

const POPULATE = [
  { path: 'student', select: 'firstName lastName admissionNumber classId', populate: { path: 'classId', select: 'cl_name' } },
  { path: 'invoice_no', select: 'invoice_no invoice_amount paid_amount balance status' },
  { path: 'student_fee_no', select: 'student_fee_no paid_amount registerDate' },
  { path: 'payment_method_no', select: 'payment_method_name' },
  { path: 'authorisedBy', select: 'username firstName lastName' }
];

export class RefundError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Recompute an invoice's paid_amount/balance/status from an amount already reflected in the DB delta. */
const applyInvoiceDelta = async (invoiceId, delta) => {
  const invoice = await StudentInvoice.findById(invoiceId);
  if (!invoice) return;
  invoice.paid_amount += delta;
  invoice.balance = invoice.invoice_amount - invoice.paid_amount;
  if (invoice.paid_amount >= invoice.invoice_amount) invoice.status = 'Paid';
  else if (invoice.paid_amount > 0) invoice.status = 'Partially_Paid';
  else invoice.status = 'Unpaid';
  await invoice.save();
};

/**
 * Issue a refund against a specific payment (StudentFee record).
 *
 * The refundable amount is that payment's own amount minus whatever has
 * already been refunded from it — a payment can be partially refunded more
 * than once, but never refunded past what was actually paid. Reverses the
 * matching amount off the invoice's paid_amount/balance/status, the same
 * adjustment studentFeeController.deleteStudentFee makes for a removed
 * payment, so the invoice ledger stays consistent either way.
 */
export const issueRefund = async ({ student_fee_no, amount, reason, payment_method_no }, authorisedBy) => {
  const fee = await StudentFee.findById(student_fee_no).populate({
    path: 'invoice_no',
    select: 'student invoice_amount paid_amount balance status'
  });
  if (!fee) throw new RefundError('Payment record not found', 404);

  const invoice = fee.invoice_no;
  if (!invoice) throw new RefundError('The invoice for this payment no longer exists', 404);

  const alreadyRefunded = await Refund.aggregate([
    { $match: { student_fee_no: fee._id, status: 'issued' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const refundedSoFar = alreadyRefunded[0]?.total ?? 0;
  const refundable = fee.paid_amount - refundedSoFar;

  if (amount > refundable) {
    throw new RefundError(
      `Refund amount (${amount}) exceeds what remains refundable on this payment (${refundable})`
    );
  }

  const refund = await Refund.create({
    refund_no: await generateRefundNumber(),
    student_fee_no: fee._id,
    invoice_no: invoice._id,
    student: invoice.student,
    amount,
    reason,
    payment_method_no,
    authorisedBy,
    refundDate: new Date()
  });

  // The invoice was paid down by this fee; a refund against it reverses that
  // same amount, mirroring deleteStudentFee's reversal.
  await applyInvoiceDelta(invoice._id, -amount);

  return Refund.findById(refund._id).populate(POPULATE);
};

export const listRefunds = async (query = {}) => {
  const filter = {};
  if (query.student_id) filter.student = query.student_id;
  if (query.status) filter.status = query.status;
  if (query.from || query.to) {
    filter.refundDate = {};
    if (query.from) filter.refundDate.$gte = new Date(query.from);
    if (query.to) {
      const to = new Date(query.to);
      to.setUTCHours(23, 59, 59, 999);
      filter.refundDate.$lte = to;
    }
  }
  return Refund.find(filter).populate(POPULATE).sort({ refundDate: -1 });
};

export const getRefundById = async (id) => Refund.findById(id).populate(POPULATE);

/**
 * Reverse a refund itself — a correction for a refund issued in error. Puts
 * the money back onto the invoice's paid_amount, the exact inverse of
 * issueRefund's adjustment.
 */
export const reverseRefund = async (id, updateBy) => {
  const refund = await Refund.findById(id);
  if (!refund) throw new RefundError('Refund not found', 404);
  if (refund.status === 'reversed') {
    throw new RefundError('This refund has already been reversed');
  }

  refund.status = 'reversed';
  refund.updateBy = updateBy;
  refund.updateDate = new Date();
  await refund.save();

  await applyInvoiceDelta(refund.invoice_no, refund.amount);

  return Refund.findById(refund._id).populate(POPULATE);
};
