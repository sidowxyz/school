import mongoose from 'mongoose';
import StudentInvoice from '../models/StudentInvoice.js';
import FeeStructure from '../models/FeeStructure.js';
import Student from '../models/Student.js';
import StudentScholarship from '../models/StudentScholarship.js';
import Status from '../models/Status.js';
import Counter from '../models/Counter.js';
import Ledger from '../models/Ledger.js';
import { getSiblingDiscountPercent } from '../services/familyService.js';
import { postJournalEntry } from '../services/journalService.js';

// Auto-generates INV-<year>-<seq> when the caller doesn't supply invoice_no,
// using the same atomic per-year Counter pattern as admission numbers
// (studentService.js) and receipt numbers (studentFeeController.js).
const generateInvoiceNumber = async () => {
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
const getActiveScholarshipDiscountPercent = async (studentId) => {
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

// Shared by createStudentInvoice and createBulkStudentInvoices so the
// discount-stacking and invoice-numbering logic only lives in one place.
// Throws { statusCode, message } on a known/expected failure.
const buildInvoiceForStudent = async (student, fee_struc_no, { paid_amount = 0, dueDate, invoice_no, invoice_amount: amountOverride } = {}, session = null) => {
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

  // Sibling discount (from the student's guardian's household) stacks with
  // any active scholarship, capped at 100%.
  const [siblingPct, scholarshipPct] = await Promise.all([
    getSiblingDiscountPercent(studentDoc.familyId),
    getActiveScholarshipDiscountPercent(studentDoc._id),
  ]);
  const discount_percentage = Math.min(100, Math.max(0, siblingPct + scholarshipPct));
  const discount_amount = Math.min(original_amount, Math.round(original_amount * discount_percentage) / 100);
  const invoice_amount = Math.max(0, original_amount - discount_amount);

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
    dueDate: dueDate ? new Date(dueDate) : undefined,
    registerDate: new Date()
  }], { session });
  const createdInvoice = createdInvoiceArray[0];

  const studentName = `${studentDoc.firstName} ${studentDoc.lastName}`;
  try {
  const lines = [];

    // 1. Debit Accounts Receivable (net invoice amount)
    if (invoice_amount > 0) {
      lines.push({
        accountCode: '1200', // Accounts Receivable
        debit: invoice_amount,
        credit: 0,
        studentId: studentDoc._id,
      });
    }

    // 2. Debit Scholarship Expense (discount amount)
    if (discount_amount > 0) {
      lines.push({
        accountCode: '5100', // Scholarship Expense
        debit: discount_amount,
        credit: 0,
        studentId: studentDoc._id,
      });
    }

    // 3. Credit Tuition Revenue (original gross amount)
    if (original_amount > 0) {
      lines.push({
        accountCode: '4000', // Tuition Revenue
        debit: 0,
        credit: original_amount,
        studentId: studentDoc._id,
      });
    }

    if (lines.length >= 2) {
      console.log('posting journal entry', { journalNumber: `JRN-${invoice_no}`, lines });
      try {
        await postJournalEntry({
          date: new Date(),
          referenceType: 'Invoice',
          referenceId: createdInvoice._id,
          journalNumber: `JRN-${invoice_no}`,
          description: `Student Invoice - ${studentName}`,
          lines,
          session
        });
      } catch (e) {
        console.error('postJournalEntry failed:', e && e.stack ? e.stack : e);
        throw e;
      }
    }
  } catch (err) {
    console.error('Error posting journal entry for invoice:', err);
    throw { statusCode: 500, message: 'Failed to post accounting journal entry: ' + err.message };
  }

  return createdInvoice;
};

const populateInvoice = (query) => query
  .populate('student', 'firstName lastName admissionNumber')
  .populate({
    path: 'fee_struc_no',
    populate: [
      { path: 'fee_type_no' },
      { path: 'lev_no' },
      { path: 'y_no' }
    ]
  });

export const createStudentInvoice = async (req, res) => {
  let session = null;
  let transactional = false;
  session = await mongoose.startSession();
    try {
      session.startTransaction();
      transactional = true;
    } catch (txErr) {
      // Transactions not supported (standalone mongod). Fall back to non-transactional mode.
      console.warn('createStudentInvoice: transactions not supported, proceeding without transaction');
      await session.endSession();
      session = null;
      transactional = false;
    }
    try {
      const { student, fee_struc_no, paid_amount = 0, dueDate, invoice_no, invoice_amount } = req.body;

    const newInvoice = await buildInvoiceForStudent(student, fee_struc_no, { paid_amount, dueDate, invoice_no, invoice_amount }, session);
    await session.commitTransaction();
    session.endSession();

    const populated = await populateInvoice(StudentInvoice.findById(newInvoice._id));

    res.status(201).json({ success: true, message: 'Student Invoice created successfully', data: populated });
  } catch (error) {
    if (transactional && session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('createStudentInvoice error:', error && error.stack ? error.stack : error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error.message, errors: error.errors || undefined });
  }
};

// POST /api/student-invoices/bulk — generate one invoice per student in a
// class against the same fee structure, skipping students who already have
// an invoice for it (so re-running the same bulk request is safe).
export const createBulkStudentInvoices = async (req, res) => {
  let session = null;
  let transactional = false;
  session = await mongoose.startSession();
    try {
      session.startTransaction();
      transactional = true;
    } catch (txErr) {
      console.warn('createBulkStudentInvoices: transactions not supported, proceeding without transaction');
      await session.endSession();
      session = null;
      transactional = false;
    }
    try {
      const { class_id, fee_struc_no, dueDate } = req.body;

    const feeStructure = await FeeStructure.findById(fee_struc_no);
    if (!feeStructure) {
      throw { statusCode: 404, message: 'Fee structure not found' };
    }

    const classStudents = await Student.find({ classId: class_id });
    if (classStudents.length === 0) {
      throw { statusCode: 404, message: 'No students found in this class' };
    }

    const existingInvoices = await StudentInvoice.find({
      student: { $in: classStudents.map((s) => s._id) },
      fee_struc_no,
    }).select('student');
    const alreadyInvoiced = new Set(existingInvoices.map((inv) => inv.student.toString()));

    const created = [];
    const skipped = [];
    for (const studentDoc of classStudents) {
      if (alreadyInvoiced.has(studentDoc._id.toString())) {
        skipped.push(studentDoc._id);
        continue;
      }
      const invoice = await buildInvoiceForStudent(studentDoc._id, fee_struc_no, { dueDate }, session);
      created.push(invoice);
    }

    if (transactional && session) {
      await session.commitTransaction();
      session.endSession();
    }

    res.status(201).json({
      success: true,
      message: `Generated ${created.length} invoice(s), skipped ${skipped.length} already-invoiced student(s)`,
      data: { createdCount: created.length, skippedCount: skipped.length },
    });
  } catch (error) {
    if (transactional && session) {
      await session.abortTransaction();
      session.endSession();
    }
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const getStudentInvoices = async (req, res) => {
  try {
    const { student, status } = req.query;
    const filter = {};
    if (student) filter.student = student;
    if (status) filter.status = status;

    const invoices = await StudentInvoice.find(filter)
      .populate('student', 'firstName lastName admissionNumber')
      .populate({
        path: 'fee_struc_no',
        populate: [
          { path: 'fee_type_no' },
          { path: 'lev_no' },
          { path: 'y_no' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentInvoiceById = async (req, res) => {
  try {
    const invoice = await StudentInvoice.findById(req.params.id)
      .populate('student', 'firstName lastName admissionNumber')
      .populate({
        path: 'fee_struc_no',
        populate: [
          { path: 'fee_type_no' },
          { path: 'lev_no' },
          { path: 'y_no' }
        ]
      });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Student Invoice not found' });
    }

    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStudentInvoice = async (req, res) => {
  try {
    const invoice = await StudentInvoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Student Invoice not found' });
    }

    const invoice_amount = req.body.invoice_amount !== undefined ? req.body.invoice_amount : invoice.invoice_amount;
    const paid_amount = req.body.paid_amount !== undefined ? req.body.paid_amount : invoice.paid_amount;
    
    const balance = invoice_amount - paid_amount;
    let status = 'Unpaid';
    if (paid_amount >= invoice_amount) {
      status = 'Paid';
    } else if (paid_amount > 0) {
      status = 'Partially_Paid';
    }

    const updatedData = {
      ...req.body,
      invoice_amount,
      paid_amount,
      balance,
      status,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await StudentInvoice.findByIdAndUpdate(req.params.id, updatedData, { new: true })
      .populate('student', 'firstName lastName admissionNumber')
      .populate({
        path: 'fee_struc_no',
        populate: [
          { path: 'fee_type_no' },
          { path: 'lev_no' },
          { path: 'y_no' }
        ]
      });

    res.status(200).json({ success: true, message: 'Student Invoice updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStudentInvoice = async (req, res) => {
  try {
    const deleted = await StudentInvoice.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Student Invoice not found' });
    }
    res.status(200).json({ success: true, message: 'Student Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
