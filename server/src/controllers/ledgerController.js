// General Ledger controller — reads from JournalLine (new COA-backed double-entry)
// while keeping the legacy Ledger sync for backwards compatibility.
import JournalLine from '../models/JournalLine.js';
import JournalEntry from '../models/JournalEntry.js';
import Ledger from '../models/Ledger.js';
import StudentFee from '../models/StudentFee.js';
import Payment from '../models/payment.js';
import StudentInvoice from '../models/StudentInvoice.js';
import PaymentMethod from '../models/PaymentMethod.js';

// ─── GENERAL LEDGER (from JournalLines + legacy Ledger fallback) ───────────────
/**
 * GET /api/ledger
 * Returns all posted journal lines enriched with their entry's metadata.
 * Falls back to the legacy Ledger collection if no JournalLines exist yet.
 */
export const getLedgerEntries = async (req, res) => {
  try {
    const { startDate, endDate, accountName } = req.query;

    // Build date filter for journal entries
    const entryFilter = { status: 'Posted' };
    if (startDate || endDate) {
      entryFilter.date = {};
      if (startDate) entryFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        entryFilter.date.$lte = end;
      }
    }

    // Try new JournalLine-based ledger first
    const journalLineCount = await JournalLine.countDocuments();

    if (journalLineCount > 0) {
      // Aggregate journal lines with their parent entry and account info
      const pipeline = [
        {
          $lookup: {
            from: 'journalentries',
            localField: 'journalEntryId',
            foreignField: '_id',
            as: 'entry'
          }
        },
        { $unwind: '$entry' },
        { $match: { 'entry.status': 'Posted', ...(entryFilter.date ? { 'entry.date': entryFilter.date } : {}) } },
        {
          $lookup: {
            from: 'chartofaccounts',
            localField: 'accountId',
            foreignField: '_id',
            as: 'account'
          }
        },
        { $unwind: '$account' },
        ...(accountName ? [{ $match: { 'account.accountName': { $regex: accountName, $options: 'i' } } }] : []),
        {
          $project: {
            _id: 1,
            date: '$entry.date',
            accountName: '$account.accountName',
            accountCode: '$account.accountCode',
            accountType: '$account.type',
            referenceNo: '$entry.journalNumber',
            referenceType: '$entry.referenceType',
            description: { $ifNull: ['$description', '$entry.description'] },
            debit: 1,
            credit: 1,
            journalEntryId: 1,
            studentId: 1,
            createdAt: 1,
          }
        },
        { $sort: { date: -1, createdAt: -1 } }
      ];

      const entries = await JournalLine.aggregate(pipeline);
      const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
      const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);

      return res.status(200).json({
        success: true,
        data: entries,
        totals: { totalDebit, totalCredit },
        source: 'journal'
      });
    }

    // ─── LEGACY FALLBACK: sync from old Ledger collection ────────────────────
    await syncLedgerFromPayments();

    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (accountName) filter.accountName = accountName;

    const entries = await Ledger.find(filter).sort({ date: -1, createdAt: -1 });
    const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
    const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);

    res.status(200).json({
      success: true,
      data: entries,
      totals: { totalDebit, totalCredit },
      source: 'legacy'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/ledger/summary
 * Aggregate totals grouped by accountName.
 */
export const getLedgerSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const journalLineCount = await JournalLine.countDocuments();

    if (journalLineCount > 0) {
      const entryFilter = { status: 'Posted' };
      if (startDate || endDate) {
        entryFilter.date = {};
        if (startDate) entryFilter.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          entryFilter.date.$lte = end;
        }
      }

      const pipeline = [
        {
          $lookup: {
            from: 'journalentries',
            localField: 'journalEntryId',
            foreignField: '_id',
            as: 'entry'
          }
        },
        { $unwind: '$entry' },
        { $match: { 'entry.status': 'Posted', ...(entryFilter.date ? { 'entry.date': entryFilter.date } : {}) } },
        {
          $lookup: {
            from: 'chartofaccounts',
            localField: 'accountId',
            foreignField: '_id',
            as: 'account'
          }
        },
        { $unwind: '$account' },
        {
          $group: {
            _id: { accountCode: '$account.accountCode', accountName: '$account.accountName', type: '$account.type', normalBalance: '$account.normalBalance' },
            totalDebit: { $sum: '$debit' },
            totalCredit: { $sum: '$credit' },
            entryCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.accountCode': 1 } }
      ];

      const summary = await JournalLine.aggregate(pipeline);
      const grandTotalDebit = summary.reduce((s, r) => s + r.totalDebit, 0);
      const grandTotalCredit = summary.reduce((s, r) => s + r.totalCredit, 0);

      return res.status(200).json({
        success: true,
        data: summary.map(s => ({
          accountCode: s._id.accountCode,
          accountName: s._id.accountName,
          accountType: s._id.type,
          normalBalance: s._id.normalBalance,
          totalDebit: s.totalDebit,
          totalCredit: s.totalCredit,
          netBalance: s._id.normalBalance === 'Debit' ? s.totalDebit - s.totalCredit : s.totalCredit - s.totalDebit,
          entryCount: s.entryCount
        })),
        grandTotals: { totalDebit: grandTotalDebit, totalCredit: grandTotalCredit }
      });
    }

    // Legacy fallback
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.date.$lte = end;
      }
    }

    const pipeline = [];
    if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage });
    pipeline.push({
      $group: {
        _id: '$accountName',
        totalDebit: { $sum: '$debit' },
        totalCredit: { $sum: '$credit' },
        entryCount: { $sum: 1 }
      }
    });
    pipeline.push({ $sort: { _id: 1 } });

    const summary = await Ledger.aggregate(pipeline);
    const grandTotalDebit = summary.reduce((s, r) => s + r.totalDebit, 0);
    const grandTotalCredit = summary.reduce((s, r) => s + r.totalCredit, 0);

    res.status(200).json({
      success: true,
      data: summary.map(s => ({
        accountName: s._id,
        totalDebit: s.totalDebit,
        totalCredit: s.totalCredit,
        entryCount: s.entryCount
      })),
      grandTotals: { totalDebit: grandTotalDebit, totalCredit: grandTotalCredit }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/ledger/accounts
 * Returns distinct account names in the ledger.
 */
export const getLedgerAccounts = async (req, res) => {
  try {
    const journalLineCount = await JournalLine.countDocuments();
    if (journalLineCount > 0) {
      const accounts = await JournalLine.aggregate([
        { $lookup: { from: 'chartofaccounts', localField: 'accountId', foreignField: '_id', as: 'account' } },
        { $unwind: '$account' },
        { $group: { _id: '$account.accountName', accountCode: { $first: '$account.accountCode' }, type: { $first: '$account.type' } } },
        { $sort: { accountCode: 1 } }
      ]);
      return res.status(200).json({ success: true, data: accounts.map(a => a._id) });
    }
    const accounts = await Ledger.distinct('accountName');
    res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/ledger/trial-balance
 * Trial Balance: all account balances from JournalLines
 */
export const getTrialBalance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const entryFilter = { status: 'Posted' };
    if (startDate || endDate) {
      entryFilter.date = {};
      if (startDate) entryFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        entryFilter.date.$lte = end;
      }
    }

    const journalLineCount = await JournalLine.countDocuments();

    // If no JournalLines exist yet, fall back to the legacy Ledger collection
    if (journalLineCount === 0) {
      const matchStage = {};
      if (startDate || endDate) {
        matchStage.date = {};
        if (startDate) matchStage.date.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchStage.date.$lte = end;
        }
      }

      const pipelineLegacy = [];
      if (Object.keys(matchStage).length > 0) pipelineLegacy.push({ $match: matchStage });
      pipelineLegacy.push({
        $group: {
          _id: '$accountName',
          totalDebit: { $sum: '$debit' },
          totalCredit: { $sum: '$credit' }
        }
      });
      pipelineLegacy.push({ $sort: { _id: 1 } });

      const rowsLegacy = await Ledger.aggregate(pipelineLegacy);
      const trialBalanceLegacy = rowsLegacy.map(r => {
        const net = r.totalDebit - r.totalCredit;
        return {
          accountCode: null,
          accountName: r._id,
          type: null,
          normalBalance: null,
          debitBalance: net > 0 ? net : 0,
          creditBalance: net < 0 ? Math.abs(net) : 0,
        };
      });

      const totalDebitBalanceLegacy = trialBalanceLegacy.reduce((s, r) => s + r.debitBalance, 0);
      const totalCreditBalanceLegacy = trialBalanceLegacy.reduce((s, r) => s + r.creditBalance, 0);

      return res.json({
        success: true,
        data: trialBalanceLegacy,
        totals: { totalDebitBalance: totalDebitBalanceLegacy, totalCreditBalance: totalCreditBalanceLegacy },
        balanced: Math.abs(totalDebitBalanceLegacy - totalCreditBalanceLegacy) < 0.01
      });
    }

    const pipeline = [
      {
        $lookup: {
          from: 'journalentries',
          localField: 'journalEntryId',
          foreignField: '_id',
          as: 'entry'
        }
      },
      { $unwind: '$entry' },
      { $match: { 'entry.status': 'Posted', ...(entryFilter.date ? { 'entry.date': entryFilter.date } : {}) } },
      {
        $lookup: {
          from: 'chartofaccounts',
          localField: 'accountId',
          foreignField: '_id',
          as: 'account'
        }
      },
      { $unwind: '$account' },
      {
        $group: {
          _id: {
            accountCode: '$account.accountCode',
            accountName: '$account.accountName',
            type: '$account.type',
            normalBalance: '$account.normalBalance'
          },
          totalDebit: { $sum: '$debit' },
          totalCredit: { $sum: '$credit' }
        }
      },
      { $sort: { '_id.accountCode': 1 } }
    ];

    const rows = await JournalLine.aggregate(pipeline);

    // Compute debit/credit balance columns as per trial balance format
    const trialBalance = rows.map(r => {
      const net = r.totalDebit - r.totalCredit;
      return {
        accountCode: r._id.accountCode,
        accountName: r._id.accountName,
        type: r._id.type,
        normalBalance: r._id.normalBalance,
        debitBalance: net > 0 ? net : 0,
        creditBalance: net < 0 ? Math.abs(net) : 0,
      };
    });

    const totalDebitBalance = trialBalance.reduce((s, r) => s + r.debitBalance, 0);
    const totalCreditBalance = trialBalance.reduce((s, r) => s + r.creditBalance, 0);

    res.json({
      success: true,
      data: trialBalance,
      totals: { totalDebitBalance, totalCreditBalance },
      balanced: Math.abs(totalDebitBalance - totalCreditBalance) < 0.01
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── LEGACY LEDGER SYNC ───────────────────────────────────────────────────────
const syncLedgerFromPayments = async () => {
  try {
    const fees = await StudentFee.find()
      .populate({ path: 'invoice_no', populate: { path: 'student', select: 'firstName lastName' } })
      .populate('payment_method_no');

    for (const fee of fees) {
      if (!fee.paid_amount || fee.paid_amount <= 0) continue;
      const refNo = fee.invoice_no?.invoice_no || fee.student_fee_no;
      if (!refNo) continue;
      const existing = await Ledger.findOne({ referenceNo: refNo, debit: fee.paid_amount });
      if (!existing) {
        const methodName = fee.payment_method_no?.payment_method_name?.toLowerCase() || '';
        const debitAccount = methodName.includes('bank') || methodName.includes('transfer') || methodName.includes('cheque') || methodName.includes('card')
          ? 'Bank Account' : 'Cash in Hand';
        const student = fee.invoice_no?.student;
        const studentName = student ? `${student.firstName} ${student.lastName}` : 'Student';
        await Ledger.insertMany([
          { date: fee.registerDate || new Date(), accountName: debitAccount, referenceNo: refNo, description: `Payment from ${studentName}`, debit: fee.paid_amount, credit: 0 },
          { date: fee.registerDate || new Date(), accountName: 'Tuition Revenue', referenceNo: refNo, description: `Revenue — ${studentName}`, debit: 0, credit: fee.paid_amount }
        ]);
      }
    }

    const payments = await Payment.find().populate('student payment_method');
    for (const p of payments) {
      if (!p.amount_paid || p.amount_paid <= 0) continue;
      const refNo = p.payment_id;
      if (!refNo) continue;
      const existing = await Ledger.findOne({ referenceNo: refNo, debit: p.amount_paid });
      if (!existing) {
        const methodName = p.payment_method?.payment_method_name?.toLowerCase() || '';
        const debitAccount = methodName.includes('bank') || methodName.includes('transfer') || methodName.includes('cheque') || methodName.includes('card')
          ? 'Bank Account' : 'Cash in Hand';
        const studentName = p.student ? `${p.student.firstName} ${p.student.lastName}` : 'Student';
        await Ledger.insertMany([
          { date: p.payment_date || new Date(), accountName: debitAccount, referenceNo: refNo, description: `Payment from ${studentName}`, debit: p.amount_paid, credit: 0 },
          { date: p.payment_date || new Date(), accountName: 'Tuition Revenue', referenceNo: refNo, description: `Revenue — ${studentName}`, debit: 0, credit: p.amount_paid }
        ]);
      }
    }
  } catch (err) {
    console.warn('Ledger sync warning:', err.message);
  }
};
