import StudentFee from '../models/StudentFee.js';
import StudentInvoice from '../models/StudentInvoice.js';
import Ledger from '../models/Ledger.js';
import PaymentMethod from '../models/PaymentMethod.js';
import Counter from '../models/Counter.js';
import { generateReceiptPDF } from '../utils/receiptPdfGenerator.js';
import path from 'path';
import fs from 'fs';

// RCPT-<year>-<seq>, the same atomic per-year Counter pattern examService uses
// for exam numbers. Every StudentFee is a real, receipted payment, so this
// number doubles as the receipt reference the Finance "Payment Receipts"
// report shows — it is generated here rather than trusted from the client so
// it is guaranteed unique and sequential, not arbitrary client-supplied text.
const generateFeeNumber = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { year },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `RCPT-${year}-${String(counter.seq).padStart(4, '0')}`;
};

export const createStudentFee = async (req, res) => {
  try {
    const { invoice_no, payment_method_no, paid_amount, acc_no } = req.body;
    let { student_fee_no } = req.body;

    if (student_fee_no) {
      // A caller-supplied number still has to be unique.
      const existing = await StudentFee.findOne({ student_fee_no });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Fee payment number already exists' });
      }
    } else {
      student_fee_no = await generateFeeNumber();
    }

    // Find invoice
    const invoice = await StudentInvoice.findById(invoice_no).populate(
      'student',
      'firstName lastName admissionNumber'
    );
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Guard against overpayment: a payment cannot exceed the invoice's
    // outstanding balance (otherwise the invoice records a negative balance).
    const outstanding = invoice.invoice_amount - invoice.paid_amount;
    if (paid_amount > outstanding) {
      return res.status(400).json({
        success: false,
        message: `Paid amount (${paid_amount}) exceeds outstanding balance (${outstanding})`
      });
    }

    // Register payment record
    const newFee = await StudentFee.create({
      student_fee_no,
      invoice_no,
      payment_method_no,
      paid_amount,
      acc_no,
      registerBy: req.user ? req.user.name || req.user.id : 'system',
      registerDate: new Date()
    });

    // Update invoice paid amount and balance
    invoice.paid_amount += paid_amount;
    invoice.balance = invoice.invoice_amount - invoice.paid_amount;
    
    if (invoice.paid_amount >= invoice.invoice_amount) {
      invoice.status = 'Paid';
    } else if (invoice.paid_amount > 0) {
      invoice.status = 'Partially_Paid';
    } else {
      invoice.status = 'Unpaid';
    }
    
    await invoice.save();

    // ── Auto-post double-entry Ledger entries ──
    // Determine the debit account based on the payment method name.
    let debitAccount = 'Cash in Hand';
    try {
      const method = await PaymentMethod.findById(payment_method_no);
      if (method) {
        const name = method.payment_method_name.toLowerCase();
        if (name.includes('bank') || name.includes('transfer') || name.includes('cheque') || name.includes('check')) {
          debitAccount = 'Bank Account';
        }
      }
    } catch { /* fallback to Cash in Hand */ }

    const invoiceRef = invoice.invoice_no || invoice._id.toString();
    const studentDoc = await StudentInvoice.findById(invoice._id)
      .populate('student', 'firstName lastName');
    const studentName = studentDoc?.student ? `${studentDoc.student.firstName} ${studentDoc.student.lastName}` : 'Student';

    // Check if scholarship discount exists on this invoice and hasn't been posted to Ledger yet
    const discountAmount = Number(invoice.discount_amount || 0);
    let scholarshipExpenseAmount = 0;
    if (discountAmount > 0) {
      const existingExpense = await Ledger.findOne({
        referenceNo: invoiceRef,
        accountName: 'Scholarship Expense'
      });
      if (!existingExpense) {
        scholarshipExpenseAmount = discountAmount;
      }
    }

    const entriesToPost = [
      {
        date: new Date(),
        accountName: debitAccount,
        referenceNo: invoiceRef,
        description: `Payment received from ${studentName}`,
        debit: paid_amount,
        credit: 0
      }
    ];

    if (scholarshipExpenseAmount > 0) {
      entriesToPost.push({
        date: new Date(),
        accountName: 'Scholarship Expense',
        referenceNo: invoiceRef,
        description: `Scholarship discount applied for ${studentName}`,
        debit: scholarshipExpenseAmount,
        credit: 0
      });
    }

    entriesToPost.push({
      date: new Date(),
      accountName: 'Tuition Revenue',
      referenceNo: invoiceRef,
      description: `Tuition revenue — ${studentName}`,
      debit: 0,
      credit: paid_amount + scholarshipExpenseAmount
    });

    await Ledger.insertMany(entriesToPost);
    // Generate the PDF receipt now that the payment and invoice are both
    // committed. This is a side effect, not the transaction itself — a
    // failure here must not turn an already-successful payment into a 500,
    // so it's logged and left for the record to simply have no pdfPath.
    try {
      const studentFullName = invoice.student
        ? `${invoice.student.firstName ?? ''} ${invoice.student.lastName ?? ''}`.trim()
        : 'Student';
      const pdfPath = await generateReceiptPDF({
        studentName: studentFullName,
        paymentId: student_fee_no,
        receiptNumber: student_fee_no,
        amount: paid_amount,
        date: newFee.registerDate,
        accNo: acc_no,
        remarks: `Invoice ${invoice.invoice_no}`
      });
      newFee.pdfPath = pdfPath;
      await newFee.save();
    } catch (pdfError) {
      console.error('Failed to generate receipt PDF for', student_fee_no, pdfError);
    }
    const populated = await StudentFee.findById(newFee._id)
      .populate('payment_method_no')
      .populate({
        path: 'invoice_no',
        populate: {
          path: 'student',
          select: 'firstName lastName admissionNumber'
        }
      });

    res.status(201).json({ success: true, message: 'Fee payment recorded successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentFees = async (req, res) => {
  try {
    const fees = await StudentFee.find()
      .populate('payment_method_no')
      .populate({
        path: 'invoice_no',
        populate: {
          path: 'student',
          select: 'firstName lastName admissionNumber'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: fees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentFeeById = async (req, res) => {
  try {
    const fee = await StudentFee.findById(req.params.id)
      .populate('payment_method_no')
      .populate({
        path: 'invoice_no',
        populate: {
          path: 'student',
          select: 'firstName lastName admissionNumber'
        }
      });

    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee payment record not found' });
    }

    res.status(200).json({ success: true, data: fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStudentFee = async (req, res) => {
  try {
    const fee = await StudentFee.findById(req.params.id);
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee payment record not found' });
    }

    const oldPaidAmount = fee.paid_amount;
    const newPaidAmount = req.body.paid_amount !== undefined ? req.body.paid_amount : oldPaidAmount;

    // If invoice is changing, that's complex, let's look up both invoices
    const targetInvoiceId = req.body.invoice_no || fee.invoice_no;
    
    if (targetInvoiceId.toString() !== fee.invoice_no.toString()) {
      // Revert old invoice
      const oldInvoice = await StudentInvoice.findById(fee.invoice_no);
      if (oldInvoice) {
        oldInvoice.paid_amount -= oldPaidAmount;
        oldInvoice.balance = oldInvoice.invoice_amount - oldInvoice.paid_amount;
        if (oldInvoice.paid_amount >= oldInvoice.invoice_amount) {
          oldInvoice.status = 'Paid';
        } else if (oldInvoice.paid_amount > 0) {
          oldInvoice.status = 'Partially_Paid';
        } else {
          oldInvoice.status = 'Unpaid';
        }
        await oldInvoice.save();
      }

      // Add to new invoice
      const newInvoice = await StudentInvoice.findById(targetInvoiceId);
      if (!newInvoice) {
        return res.status(404).json({ success: false, message: 'Target invoice not found' });
      }
      newInvoice.paid_amount += newPaidAmount;
      newInvoice.balance = newInvoice.invoice_amount - newInvoice.paid_amount;
      if (newInvoice.paid_amount >= newInvoice.invoice_amount) {
        newInvoice.status = 'Paid';
      } else if (newInvoice.paid_amount > 0) {
        newInvoice.status = 'Partially_Paid';
      } else {
        newInvoice.status = 'Unpaid';
      }
      await newInvoice.save();
    } else {
      // Same invoice, calculate diff
      const diff = newPaidAmount - oldPaidAmount;
      if (diff !== 0) {
        const invoice = await StudentInvoice.findById(fee.invoice_no);
        if (invoice) {
          invoice.paid_amount += diff;
          invoice.balance = invoice.invoice_amount - invoice.paid_amount;
          if (invoice.paid_amount >= invoice.invoice_amount) {
            invoice.status = 'Paid';
          } else if (invoice.paid_amount > 0) {
            invoice.status = 'Partially_Paid';
          } else {
            invoice.status = 'Unpaid';
          }
          await invoice.save();
        }
      }
    }

    const updatedData = {
      ...req.body,
      updateDate: new Date(),
      updateBy: req.user ? req.user.name || req.user.id : 'system'
    };

    const updated = await StudentFee.findByIdAndUpdate(req.params.id, updatedData, { new: true })
      .populate('payment_method_no')
      .populate({
        path: 'invoice_no',
        populate: {
          path: 'student',
          select: 'firstName lastName admissionNumber'
        }
      });

    res.status(200).json({ success: true, message: 'Fee payment record updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStudentFee = async (req, res) => {
  try {
    const fee = await StudentFee.findById(req.params.id);
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee payment record not found' });
    }

    // Revert the payment amount from the invoice
    const invoice = await StudentInvoice.findById(fee.invoice_no);
    if (invoice) {
      invoice.paid_amount -= fee.paid_amount;
      invoice.balance = invoice.invoice_amount - invoice.paid_amount;
      if (invoice.paid_amount >= invoice.invoice_amount) {
        invoice.status = 'Paid';
      } else if (invoice.paid_amount > 0) {
        invoice.status = 'Partially_Paid';
      } else {
        invoice.status = 'Unpaid';
      }
      await invoice.save();
    }

    await StudentFee.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Fee payment record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/student-fees/:id/receipt — download the real PDF receipt
// generated when this payment was recorded (see createStudentFee).
export const downloadStudentFeeReceipt = async (req, res) => {
  try {
    const fee = await StudentFee.findById(req.params.id);
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee payment record not found' });
    }
    if (!fee.pdfPath) {
      return res.status(404).json({
        success: false,
        message: 'No receipt PDF was generated for this payment'
      });
    }

    const pdfFullPath = path.resolve(fee.pdfPath);
    if (!fs.existsSync(pdfFullPath)) {
      return res.status(404).json({ success: false, message: 'Receipt PDF file not found on disk' });
    }

    // student_fee_no can be caller-supplied text (see createStudentFee) —
    // strip it to filename-safe characters before it goes into a header.
    const safeFilename = fee.student_fee_no.replace(/[^\w.-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.pdf"`);
    res.sendFile(pdfFullPath);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
