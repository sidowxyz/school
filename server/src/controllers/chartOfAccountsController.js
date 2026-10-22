import ChartOfAccount from '../models/ChartOfAccount.js';

// ─── GET ALL ──────────────────────────────────────────────────────────────────
export const getAccounts = async (req, res) => {
  try {
    const accounts = await ChartOfAccount.find({ isActive: true }).sort({ accountCode: 1 });
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const createAccount = async (req, res) => {
  try {
    const account = await ChartOfAccount.create(req.body);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateAccount = async (req, res) => {
  try {
    const account = await ChartOfAccount.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: account });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── DELETE (soft) ────────────────────────────────────────────────────────────
export const deleteAccount = async (req, res) => {
  try {
    const account = await ChartOfAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
    if (account.isSystemAccount) {
      return res.status(403).json({ success: false, message: 'System accounts cannot be deleted.' });
    }
    account.isActive = false;
    await account.save();
    res.json({ success: true, message: 'Account deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SEED DEFAULT COA ─────────────────────────────────────────────────────────
export const seedAccounts = async (req, res) => {
  try {
    const count = await ChartOfAccount.countDocuments();
    if (count > 0) {
      return res.status(200).json({ success: true, message: `Chart of Accounts already has ${count} entries. Skipped.` });
    }
    await seedDefaultAccounts();
    res.status(201).json({ success: true, message: 'Default Chart of Accounts seeded successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── INTERNAL SEED HELPER (called from autoSeed) ──────────────────────────────
export const seedDefaultAccounts = async () => {
  const count = await ChartOfAccount.countDocuments();
  if (count > 0) return; // already seeded

  const defaultAccounts = [
    // Assets (1xxx)
    { accountCode: '1000', accountName: 'Cash',                    type: 'Asset',     normalBalance: 'Debit',  isSystemAccount: true  },
    { accountCode: '1010', accountName: 'Bank',                    type: 'Asset',     normalBalance: 'Debit'  },
    { accountCode: '1100', accountName: 'Petty Cash',              type: 'Asset',     normalBalance: 'Debit'  },
    { accountCode: '1200', accountName: 'Accounts Receivable',     type: 'Asset',     normalBalance: 'Debit',  isSystemAccount: true, allowManualPosting: false },
    { accountCode: '1300', accountName: 'Prepaid Expenses',        type: 'Asset',     normalBalance: 'Debit'  },
    { accountCode: '1500', accountName: 'Fixed Assets',            type: 'Asset',     normalBalance: 'Debit'  },
    { accountCode: '1590', accountName: 'Accumulated Depreciation', type: 'Asset',    normalBalance: 'Credit' },

    // Liabilities (2xxx)
    { accountCode: '2000', accountName: 'Accounts Payable',        type: 'Liability', normalBalance: 'Credit', isSystemAccount: true, allowManualPosting: false },
    { accountCode: '2100', accountName: 'Salaries Payable',        type: 'Liability', normalBalance: 'Credit' },
    { accountCode: '2200', accountName: 'Accrued Liabilities',     type: 'Liability', normalBalance: 'Credit' },
    { accountCode: '2300', accountName: 'Tax Payable',             type: 'Liability', normalBalance: 'Credit' },

    // Equity (3xxx)
    { accountCode: '3000', accountName: 'Owner Capital',           type: 'Equity',    normalBalance: 'Credit' },
    { accountCode: '3100', accountName: 'Retained Earnings',       type: 'Equity',    normalBalance: 'Credit', isSystemAccount: true },

    // Revenue (4xxx)
    { accountCode: '4000', accountName: 'Tuition Revenue',         type: 'Revenue',   normalBalance: 'Credit', isSystemAccount: true },
    { accountCode: '4100', accountName: 'Registration Fees',       type: 'Revenue',   normalBalance: 'Credit' },
    { accountCode: '4200', accountName: 'Library Fees',            type: 'Revenue',   normalBalance: 'Credit' },
    { accountCode: '4300', accountName: 'Other Revenue',           type: 'Revenue',   normalBalance: 'Credit' },

    // Expenses (5xxx)
    { accountCode: '5000', accountName: 'Salaries Expense',        type: 'Expense',   normalBalance: 'Debit'  },
    { accountCode: '5100', accountName: 'Scholarship Expense',     type: 'Expense',   normalBalance: 'Debit',  isSystemAccount: true },
    { accountCode: '5200', accountName: 'Depreciation Expense',    type: 'Expense',   normalBalance: 'Debit'  },
    { accountCode: '5300', accountName: 'Utilities Expense',       type: 'Expense',   normalBalance: 'Debit'  },
    { accountCode: '5400', accountName: 'Supplies Expense',        type: 'Expense',   normalBalance: 'Debit'  },
    { accountCode: '5500', accountName: 'General Expenses',        type: 'Expense',   normalBalance: 'Debit'  },
  ];

  await ChartOfAccount.insertMany(defaultAccounts);
  console.log('✅ Chart of Accounts seeded (25 default accounts).');
};
