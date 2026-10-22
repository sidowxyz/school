import JournalLine from '../models/JournalLine.js';
import StudentInvoice from '../models/StudentInvoice.js';
import ChartOfAccount from '../models/ChartOfAccount.js';

/**
 * Helper: Aggregate balances by account type from posted JournalLines
 */
const getAccountBalances = async (dateFilter = {}) => {
  const pipeline = [
    {
      $lookup: {
        from: 'journalentries',
        localField: 'journalEntryId',
        foreignField: '_id',
        as: 'entry',
      },
    },
    { $unwind: '$entry' },
    {
      $match: {
        'entry.status': 'Posted',
        ...(dateFilter.date ? { 'entry.date': dateFilter.date } : {}),
      },
    },
    {
      $lookup: {
        from: 'chartofaccounts',
        localField: 'accountId',
        foreignField: '_id',
        as: 'account',
      },
    },
    { $unwind: '$account' },
    {
      $group: {
        _id: {
          accountId: '$account._id',
          accountCode: '$account.accountCode',
          accountName: '$account.accountName',
          type: '$account.type',
          normalBalance: '$account.normalBalance',
        },
        totalDebit: { $sum: '$debit' },
        totalCredit: { $sum: '$credit' },
      },
    },
    { $sort: { '_id.accountCode': 1 } },
  ];

  const results = await JournalLine.aggregate(pipeline);

  return results.map((r) => {
    const isDebitNormal = r._id.normalBalance === 'Debit';
    const balance = isDebitNormal
      ? r.totalDebit - r.totalCredit
      : r.totalCredit - r.totalDebit;

    return {
      accountId: r._id.accountId,
      accountCode: r._id.accountCode,
      accountName: r._id.accountName,
      type: r._id.type,
      normalBalance: r._id.normalBalance,
      totalDebit: r.totalDebit,
      totalCredit: r.totalCredit,
      balance,
    };
  });
};

/**
 * GET /api/financial-reports/income-statement
 * Revenues, Expenses, and Net Income
 */
export const getIncomeStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.$lte = end;
      }
    }

    const balances = await getAccountBalances(dateFilter);

    const revenues = balances.filter((b) => b.type === 'Revenue');
    const expenses = balances.filter((b) => b.type === 'Expense');

    const totalRevenue = revenues.reduce((s, r) => s + r.balance, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.balance, 0);
    const netIncome = totalRevenue - totalExpenses;

    res.json({
      success: true,
      data: {
        period: { startDate: startDate || 'All Time', endDate: endDate || 'Present' },
        revenues,
        totalRevenue,
        expenses,
        totalExpenses,
        netIncome,
        isProfitable: netIncome >= 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/financial-reports/balance-sheet
 * Assets = Liabilities + Equity
 */
export const getBalanceSheet = async (req, res) => {
  try {
    const { asOfDate } = req.query;
    const dateFilter = {};
    if (asOfDate) {
      const end = new Date(asOfDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.date = { $lte: end };
    }

    const balances = await getAccountBalances(dateFilter);

    const assets = balances.filter((b) => b.type === 'Asset');
    const liabilities = balances.filter((b) => b.type === 'Liability');
    const equity = balances.filter((b) => b.type === 'Equity');

    // Calculate current net income to roll into retained earnings / equity
    const revenues = balances.filter((b) => b.type === 'Revenue');
    const expenses = balances.filter((b) => b.type === 'Expense');
    const totalRev = revenues.reduce((s, r) => s + r.balance, 0);
    const totalExp = expenses.reduce((s, e) => s + e.balance, 0);
    const currentPeriodEarnings = totalRev - totalExp;

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const baseEquity = equity.reduce((s, eq) => s + eq.balance, 0);
    const totalEquity = baseEquity + currentPeriodEarnings;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    res.json({
      success: true,
      data: {
        asOfDate: asOfDate || new Date().toISOString().split('T')[0],
        assets,
        totalAssets,
        liabilities,
        totalLiabilities,
        equity,
        currentPeriodEarnings,
        totalEquity,
        totalLiabilitiesAndEquity,
        isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/financial-reports/cash-flow
 * Cash and bank inflows and outflows
 */
export const getCashFlowStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.$lte = end;
      }
    }

    // Cash and Bank accounts: codes starting with 10 (1000 Cash, 1010 Bank, etc.)
    const pipeline = [
      {
        $lookup: {
          from: 'journalentries',
          localField: 'journalEntryId',
          foreignField: '_id',
          as: 'entry',
        },
      },
      { $unwind: '$entry' },
      {
        $match: {
          'entry.status': 'Posted',
          ...(dateFilter.date ? { 'entry.date': dateFilter.date } : {}),
        },
      },
      {
        $lookup: {
          from: 'chartofaccounts',
          localField: 'accountId',
          foreignField: '_id',
          as: 'account',
        },
      },
      { $unwind: '$account' },
      {
        $match: {
          $or: [
            { 'account.accountCode': { $regex: '^10' } },
            { 'account.accountName': { $regex: 'cash|bank', $options: 'i' } },
          ],
        },
      },
      {
        $group: {
          _id: '$entry.referenceType',
          inflow: { $sum: '$debit' },
          outflow: { $sum: '$credit' },
          count: { $sum: 1 },
        },
      },
    ];

    const flows = await JournalLine.aggregate(pipeline);

    const operatingActivities = [];
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const f of flows) {
      const net = f.inflow - f.outflow;
      totalInflow += f.inflow;
      totalOutflow += f.outflow;
      operatingActivities.push({
        activityType: f._id || 'Other Activity',
        inflow: f.inflow,
        outflow: f.outflow,
        netCashFlow: net,
        transactionCount: f.count,
      });
    }

    const netChangeInCash = totalInflow - totalOutflow;

    res.json({
      success: true,
      data: {
        period: { startDate: startDate || 'All Time', endDate: endDate || 'Present' },
        operatingActivities,
        totalInflow,
        totalOutflow,
        netChangeInCash,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/financial-reports/ar-aging
 * Accounts Receivable aging analysis
 */
export const getArAgingReport = async (req, res) => {
  try {
    const unpaidInvoices = await StudentInvoice.find({
      balance: { $gt: 0 },
    })
      .populate('student', 'firstName lastName admissionNumber admission_no phoneNumber')
      .populate('fee_struc_no')
      .sort({ dueDate: 1 });

    const today = new Date();

    const buckets = {
      current: { label: 'Current (Not Due)', count: 0, amount: 0, invoices: [] },
      days1_30: { label: '1 - 30 Days Overdue', count: 0, amount: 0, invoices: [] },
      days31_60: { label: '31 - 60 Days Overdue', count: 0, amount: 0, invoices: [] },
      days61_90: { label: '61 - 90 Days Overdue', count: 0, amount: 0, invoices: [] },
      days90Plus: { label: '90+ Days Overdue', count: 0, amount: 0, invoices: [] },
    };

    let grandTotalBalance = 0;

    for (const inv of unpaidInvoices) {
      const bal = inv.balance || 0;
      grandTotalBalance += bal;

      const due = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.registerDate || inv.createdAt);
      const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));

      const invData = {
        _id: inv._id,
        invoiceNo: inv.invoice_no,
        studentName: inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : 'Student',
        admissionNumber: inv.student?.admissionNumber || inv.student?.admission_no || '—',
        phone: inv.student?.phoneNumber || '—',
        dueDate: inv.dueDate,
        invoiceAmount: inv.invoice_amount,
        paidAmount: inv.paid_amount,
        balance: bal,
        daysOverdue: Math.max(0, diffDays),
      };

      if (diffDays <= 0) {
        buckets.current.count++;
        buckets.current.amount += bal;
        buckets.current.invoices.push(invData);
      } else if (diffDays <= 30) {
        buckets.days1_30.count++;
        buckets.days1_30.amount += bal;
        buckets.days1_30.invoices.push(invData);
      } else if (diffDays <= 60) {
        buckets.days31_60.count++;
        buckets.days31_60.amount += bal;
        buckets.days31_60.invoices.push(invData);
      } else if (diffDays <= 90) {
        buckets.days61_90.count++;
        buckets.days61_90.amount += bal;
        buckets.days61_90.invoices.push(invData);
      } else {
        buckets.days90Plus.count++;
        buckets.days90Plus.amount += bal;
        buckets.days90Plus.invoices.push(invData);
      }
    }

    res.json({
      success: true,
      data: {
        totalReceivable: grandTotalBalance,
        totalUnpaidInvoices: unpaidInvoices.length,
        buckets,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
