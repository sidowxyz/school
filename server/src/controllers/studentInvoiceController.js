import mongoose from 'mongoose';
import StudentInvoice from '../models/StudentInvoice.js';
import FeeStructure from '../models/FeeStructure.js';
import Student from '../models/Student.js';
import { abortTransaction, commitTransaction, startTransaction } from '../utils/transaction.js';
import { buildInvoiceForStudent } from '../services/invoiceService.js';

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
  // startTransaction is a no-op on a standalone mongod (see utils/transaction.js).
  const session = await mongoose.startSession();
  await startTransaction(session);
    try {
      const { student, fee_struc_no, paid_amount = 0, dueDate, invoice_no, invoice_amount } = req.body;

    const newInvoice = await buildInvoiceForStudent(student, fee_struc_no, { paid_amount, dueDate, invoice_no, invoice_amount }, session);
    await commitTransaction(session);
    session.endSession();

    const populated = await populateInvoice(StudentInvoice.findById(newInvoice._id));

    res.status(201).json({ success: true, message: 'Student Invoice created successfully', data: populated });
  } catch (error) {
    await abortTransaction(session);
    session.endSession();
    console.error('createStudentInvoice error:', error && error.stack ? error.stack : error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error.message, errors: error.errors || undefined });
  }
};

// POST /api/student-invoices/bulk — generate one invoice per student in a
// class against the same fee structure, skipping students who already have
// an invoice for it (so re-running the same bulk request is safe).
export const createBulkStudentInvoices = async (req, res) => {
  const session = await mongoose.startSession();
  await startTransaction(session);
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

    await commitTransaction(session);
    session.endSession();

    res.status(201).json({
      success: true,
      message: `Generated ${created.length} invoice(s), skipped ${skipped.length} already-invoiced student(s)`,
      data: { createdCount: created.length, skippedCount: skipped.length },
    });
  } catch (error) {
    await abortTransaction(session);
    session.endSession();
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
