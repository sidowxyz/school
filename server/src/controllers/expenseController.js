import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import Supplier from '../models/Supplier.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import { postJournalEntry } from '../services/journalService.js';
import { abortTransaction, commitTransaction, startTransaction } from '../utils/transaction.js';

// ─── SUPPLIER CONTROLLERS ──────────────────────────────────────────────────
export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ status: 'Active' }).sort({ supplierName: 1 });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, { status: 'Inactive' }, { new: true });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, message: 'Supplier deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── EXPENSE CONTROLLERS ───────────────────────────────────────────────────
export const getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, categoryAccountId, status } = req.query;
    const filter = {};
    if (categoryAccountId) filter.categoryAccountId = categoryAccountId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = end;
      }
    }

    const expenses = await Expense.find(filter)
      .populate('categoryAccountId', 'accountCode accountName type')
      .populate('paymentAccountId', 'accountCode accountName type')
      .populate('supplierId', 'supplierName phone email')
      .populate('recordedBy', 'firstName lastName')
      .sort({ expenseDate: -1, createdAt: -1 });

    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    res.json({ success: true, data: expenses, totalAmount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createExpense = async (req, res) => {
  const session = await mongoose.startSession();
  await startTransaction(session);

  try {
    const {
      expenseDate = new Date(),
      categoryAccountId,
      paymentAccountId,
      supplierId,
      title,
      description,
      amount,
      paymentMethod = 'Cash',
      referenceNo,
      status = 'Paid',
    } = req.body;

    if (!amount || amount <= 0) {
      await abortTransaction(session);
      session.endSession();
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }

    const expenseNumber = `EXP-${Date.now()}`;

    // Verify accounts
    const [categoryAccount, paymentAccount] = await Promise.all([
      ChartOfAccount.findById(categoryAccountId).session(session),
      ChartOfAccount.findById(paymentAccountId).session(session),
    ]);

    if (!categoryAccount || !paymentAccount) {
      await abortTransaction(session);
      session.endSession();
      return res.status(400).json({ success: false, message: 'Valid expense and payment accounts are required' });
    }

    const createdExpense = new Expense({
      expenseNumber,
      expenseDate,
      categoryAccountId,
      paymentAccountId,
      supplierId: supplierId || undefined,
      title,
      description,
      amount,
      paymentMethod,
      referenceNo,
      status,
      recordedBy: req.user?._id,
    });

    // Post double-entry journal lines:
    // Debit: Expense Account
    // Credit: Cash / Bank / Accounts Payable
    const lines = [
      {
        accountId: categoryAccount._id,
        debit: amount,
        credit: 0,
        description: `Expense: ${title}`,
      },
      {
        accountId: paymentAccount._id,
        debit: 0,
        credit: amount,
        description: `Payment for: ${title}`,
      },
    ];

    const journalEntry = await postJournalEntry({
      date: expenseDate,
      referenceType: 'Expense',
      referenceId: createdExpense._id,
      journalNumber: `JRN-${expenseNumber}`,
      description: `Expense: ${title} - ${categoryAccount.accountName}`,
      lines,
      session,
    });

    createdExpense.journalEntryId = journalEntry?._id;
    await createdExpense.save({ session });

    await commitTransaction(session);
    session.endSession();

    const populated = await Expense.findById(createdExpense._id)
      .populate('categoryAccountId', 'accountCode accountName')
      .populate('paymentAccountId', 'accountCode accountName')
      .populate('supplierId', 'supplierName');

    res.status(201).json({ success: true, message: 'Expense recorded and journal entry posted', data: populated });
  } catch (error) {
    await abortTransaction(session);
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};
