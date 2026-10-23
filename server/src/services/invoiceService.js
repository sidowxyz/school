import StudentInvoice from '../models/StudentInvoice.js';
import FeeStructure from '../models/FeeStructure.js';
import Student from '../models/Student.js';
import StudentScholarship from '../models/StudentScholarship.js';
import Status from '../models/Status.js';
import Counter from '../models/Counter.js';
import { getSiblingDiscountPercent } from './familyService.js';
import { postJournalEntry } from './journalService.js';

// Auto-generates INV-<year>-<seq> when the caller doesn't supply invoice_no,
// using the same atomic per-year Counter pattern as admission numbers
// (studentService.js) and receipt numbers (paymentService.js).
export const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `INV-${year}-${String(counter.seq).padStart(4, '0')}`;
};

// A student's active scholarship (if any) contributes its discount_value,
// treated as a percentage — the same convention the Scholarships UI uses for
// its "Discount (%)" field.
export const getActiveScholarshipDiscountPercent = async (studentId) => {
  const activeStatus = await Status.findOne({ st_name: 'Active' });
  if (!activeStatus) return 0;

  const now = new Date();
  const assignment = await StudentScholarship.findOne({
    st_no: studentId,
    status_no: activeStatus._id,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).populate('scholarship_id');

  return assignment?.scholarship_id?.discount_value || 0;
};

/**
 * What a student would actually be charged for `original_amount`: sibling % +
 * scholarship % + their own standing discount (Student.fee_discount, a % or a
 * fixed amount), capped at the fee. Used both to create invoices and to preview
 * a student's monthly fee, so the two can never disagree.
 */
export const computeStudentDiscount = async (studentDoc, original_amount) => {
  const [siblingPct, scholarshipPct] = await Promise.all([
    getSiblingDiscountPercent(studentDoc.familyId),
    getActiveScholarshipDiscountPercent(studentDoc._id),
  ]);
  const own = studentDoc.fee_discount;
  const ownPct = own?.kind === 'percent' ? Number(own.value) || 0 : 0;
  const ownAmount = own?.kind === 'amount' ? Number(own.value) || 0 : 0;

  const discount_percentage = Math.min(100, Math.max(0, siblingPct + scholarshipPct + ownPct));
  const discount_amount = Math.min(
    original_amount,
    Math.round(original_amount * discount_percentage) / 100 + ownAmount
  );
  return {
    discount_percentage,
    discount_amount,
    invoice_amount: Math.max(0, original_amount - discount_amount),
    parts: { siblingPct, scholarshipPct, ownPct, ownAmount },
  };
};

/**
 * Creates one invoice, applying every discount the student qualifies for, and
 * posts its accounting journal. Shared by the one-off invoice endpoints and
 * the monthly fee charge so discounts and numbering only live in one place.
 *
 * Discounts stack: sibling % + scholarship % + the student's own standing
 * discount (Student.fee_discount, a % or a fixed amount), capped at the fee.
 *
 * Options:
 *   period   'YYYY-MM' — set for monthly class fees; one invoice per student per month
 *   class_id the class the student was in when charged, for class reports
 *
 * Throws { statusCode, message } on a known/expected failure.
 */
export const buildInvoiceForStudent = async (
  student,
  fee_struc_no,
  { paid_amount = 0, dueDate, invoice_no, invoice_amount: amountOverride, period, class_id } = {},
  session = null
) => {
  if (invoice_no) {
    const existing = await StudentInvoice.findOne({ invoice_no });
    if (existing) {
      throw { statusCode: 400, message: 'Invoice number already exists' };
    }
  } else {
    invoice_no = await generateInvoiceNumber();
  }

  const feeStructure = await FeeStructure.findById(fee_struc_no);
  if (!feeStructure) {
    throw { statusCode: 404, message: 'Fee structure not found' };
  }

  const studentDoc = await Student.findById(student);
  if (!studentDoc) {
    throw { statusCode: 404, message: 'Student not found' };
  }

  const original_amount = amountOverride !== undefined ? amountOverride : feeStructure.amount;
  const { discount_percentage, discount_amount, invoice_amount } = await computeStudentDiscount(studentDoc, original_amount);

  const balance = Math.max(0, invoice_amount - paid_amount);
  let status = 'Unpaid';
  if (paid_amount >= invoice_amount || invoice_amount === 0) {
    status = 'Paid';
  } else if (paid_amount > 0) {
    status = 'Partially_Paid';
  }

  const createdInvoiceArray = await StudentInvoice.create([{
    invoice_no,
    student,
    fee_struc_no,
    invoice_amount,
    original_amount,
    discount_percentage,
    discount_amount,
    paid_amount,
    balance,
    status,
    period,
    class_id,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    registerDate: new Date()
  }], { session });
  const createdInvoice = createdInvoiceArray[0];

  const studentName = `${studentDoc.firstName} ${studentDoc.lastName}`;
  try {
    const lines = [];

    // 1. Debit Accounts Receivable (net invoice amount)
    if (invoice_amount > 0) {
      lines.push({ accountCode: '1200', debit: invoice_amount, credit: 0, studentId: studentDoc._id });
    }

    // 2. Debit Scholarship Expense (discount amount)
    if (discount_amount > 0) {
      lines.push({ accountCode: '5100', debit: discount_amount, credit: 0, studentId: studentDoc._id });
    }

    // 3. Credit Tuition Revenue (original gross amount)
    if (original_amount > 0) {
      lines.push({ accountCode: '4000', debit: 0, credit: original_amount, studentId: studentDoc._id });
    }

    if (lines.length >= 2) {
      await postJournalEntry({
        date: new Date(),
        referenceType: 'Invoice',
        referenceId: createdInvoice._id,
        journalNumber: `JRN-${invoice_no}`,
        description: `Student Invoice - ${studentName}${period ? ` (${period})` : ''}`,
        lines,
        session
      });
    }
  } catch (err) {
    console.error('Error posting journal entry for invoice:', err);
    throw { statusCode: 500, message: 'Failed to post accounting journal entry: ' + err.message };
  }

  return createdInvoice;
};
