import StudentFee from '../models/StudentFee.js';
import StudentInvoice from '../models/StudentInvoice.js';
import { applyPaymentToInvoice, attachReceiptPdf } from '../services/paymentService.js';
import path from 'path';
import fs from 'fs';

export const createStudentFee = async (req, res) => {
  try {
    const { invoice_no, payment_method_no, paid_amount, acc_no } = req.body;
    const { student_fee_no } = req.body;

    // A caller-supplied number still has to be unique.
    if (student_fee_no && await StudentFee.exists({ student_fee_no })) {
      return res.status(400).json({ success: false, message: 'Fee payment number already exists' });
    }

    const { fee, invoice } = await applyPaymentToInvoice({
      invoiceId: invoice_no,
      amount: paid_amount,
      payment_method_no,
      acc_no,
      student_fee_no,
      registerBy: req.user ? req.user.name || req.user.id : 'system',
    });
    await attachReceiptPdf(fee, invoice);

    const populated = await StudentFee.findById(fee._id)
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
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
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
    // Payments taken at the counter (one receipt for several siblings/months)
    // don't render a PDF per line up front, and old files can be cleaned off
    // disk — so render it on first request instead of failing.
    if (!fee.pdfPath || !fs.existsSync(path.resolve(fee.pdfPath))) {
      const invoice = await StudentInvoice.findById(fee.invoice_no).populate('student', 'firstName lastName');
      if (invoice) {
        await attachReceiptPdf(fee, invoice, invoice.period ? `Monthly fee ${invoice.period}` : undefined);
      }
    }
    if (!fee.pdfPath) {
      return res.status(404).json({
        success: false,
        message: 'No receipt PDF could be generated for this payment'
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
