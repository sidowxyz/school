import StudentFee from '../models/StudentFee.js';
import StudentInvoice from '../models/StudentInvoice.js';
import Ledger from '../models/Ledger.js';
import PaymentMethod from '../models/PaymentMethod.js';
import Counter from '../models/Counter.js';
import { generateReceiptPDF } from '../utils/receiptPdfGenerator.js';

// RCPT-<year>-<seq>, from an atomic per-year Counter. Every StudentFee is a real, receipted payment, so this
// number doubles as the receipt reference the Finance "Payment Receipts"
// report shows — it is generated here rather than trusted from the client so
// it is guaranteed unique and sequential, not arbitrary client-supplied text.
export const generateFeeNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `RCPT-${year}-${String(counter.seq).padStart(4, '0')}`;
};

const debitAccountFor = async (paymentMethodId) => {
  try {
    const method = await PaymentMethod.findById(paymentMethodId);
    const name = method?.payment_method_name?.toLowerCase() ?? '';
    if (name.includes('bank') || name.includes('transfer') || name.includes('cheque') || name.includes('check')) {
      return 'Bank Account';
    }
  } catch { /* fall back to cash */ }
  return 'Cash in Hand';
};

/**
 * Records one payment against one invoice: creates the StudentFee, moves the
 * invoice's paid/balance/status, and posts the double-entry ledger lines.
 * Throws { statusCode, message } when the invoice is missing or the amount
 * would overpay it.
 */
export const applyPaymentToInvoice = async ({
  invoiceId,
  amount,
  payment_method_no,
  acc_no,
  student_fee_no,
  registerBy = 'system',
  session = null,
}) => {
  const invoice = await StudentInvoice.findById(invoiceId)
    .populate('student', 'firstName lastName admissionNumber')
    .session(session);
  if (!invoice) throw { statusCode: 404, message: 'Invoice not found' };

  // Guard against overpayment: a payment cannot exceed the invoice's
  // outstanding balance (otherwise the invoice records a negative balance).
  const outstanding = invoice.invoice_amount - invoice.paid_amount;
  if (amount > outstanding + 1e-9) {
    throw { statusCode: 400, message: `Paid amount (${amount}) exceeds outstanding balance (${outstanding})` };
  }

  const [fee] = await StudentFee.create([{
    student_fee_no: student_fee_no || await generateFeeNumber(),
    invoice_no: invoice._id,
    payment_method_no,
    paid_amount: amount,
    acc_no,
    registerBy,
    registerDate: new Date()
  }], { session });

  invoice.paid_amount += amount;
  invoice.balance = Math.max(0, invoice.invoice_amount - invoice.paid_amount);
  invoice.status = invoice.paid_amount >= invoice.invoice_amount
    ? 'Paid'
    : invoice.paid_amount > 0 ? 'Partially_Paid' : 'Unpaid';
  await invoice.save({ session });

  // ── Auto-post double-entry Ledger entries ──
  const invoiceRef = invoice.invoice_no || invoice._id.toString();
  const studentName = invoice.student ? `${invoice.student.firstName} ${invoice.student.lastName}` : 'Student';

  // Post the invoice's discount as Scholarship Expense once, on its first payment.
  const discountAmount = Number(invoice.discount_amount || 0);
  let scholarshipExpenseAmount = 0;
  if (discountAmount > 0) {
    const existingExpense = await Ledger.findOne({ referenceNo: invoiceRef, accountName: 'Scholarship Expense' }).session(session);
    if (!existingExpense) scholarshipExpenseAmount = discountAmount;
  }

  const entries = [{
    date: new Date(),
    accountName: await debitAccountFor(payment_method_no),
    referenceNo: invoiceRef,
    description: `Payment received from ${studentName}`,
    debit: amount,
    credit: 0
  }];
  if (scholarshipExpenseAmount > 0) {
    entries.push({
      date: new Date(),
      accountName: 'Scholarship Expense',
      referenceNo: invoiceRef,
      description: `Scholarship discount applied for ${studentName}`,
      debit: scholarshipExpenseAmount,
      credit: 0
    });
  }
  entries.push({
    date: new Date(),
    accountName: 'Tuition Revenue',
    referenceNo: invoiceRef,
    description: `Tuition revenue — ${studentName}`,
    debit: 0,
    credit: amount + scholarshipExpenseAmount
  });
  await Ledger.insertMany(entries, { session });

  return { fee, invoice };
};

/**
 * Best-effort PDF receipt for a recorded payment. A failure here must not turn
 * an already-successful payment into an error, so it is logged and the record
 * is simply left without a pdfPath.
 */
export const attachReceiptPdf = async (fee, invoice, remarks) => {
  try {
    const studentName = invoice.student
      ? `${invoice.student.firstName ?? ''} ${invoice.student.lastName ?? ''}`.trim()
      : 'Student';
    fee.pdfPath = await generateReceiptPDF({
      studentName,
      paymentId: fee.student_fee_no,
      receiptNumber: fee.student_fee_no,
      amount: fee.paid_amount,
      date: fee.registerDate,
      accNo: fee.acc_no,
      remarks: remarks ?? `Invoice ${invoice.invoice_no}`
    });
    await fee.save();
  } catch (pdfError) {
    console.error('Failed to generate receipt PDF for', fee.student_fee_no, pdfError);
  }
};
