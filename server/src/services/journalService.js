import mongoose from 'mongoose';
import JournalEntry from '../models/JournalEntry.js';
import JournalLine from '../models/JournalLine.js';
import ChartOfAccount from '../models/ChartOfAccount.js';

/**
 * Helper to post a balanced journal entry
 * @param {Object} params
 * @param {Date} params.date
 * @param {String} params.referenceType (e.g. 'Payment', 'Invoice')
 * @param {String} params.referenceId (ObjectId)
 * @param {String} params.journalNumber (e.g. 'PAY-123')
 * @param {String} params.description
 * @param {Array} params.lines Array of { accountName or accountCode, debit, credit, description, studentId }
 * @param {ClientSession} params.session Mongoose transaction session
 */
export const postJournalEntry = async ({
  date = new Date(),
  referenceType,
  referenceId,
  journalNumber,
  description,
  lines,
  session
}) => {
  if (!lines || lines.length < 2) {
    throw new Error('A journal entry must have at least two lines.');
  }

  // 1. Calculate and validate balancing
  let totalDebit = 0;
  let totalCredit = 0;
  
  for (const line of lines) {
    totalDebit += Number(line.debit || 0);
    totalCredit += Number(line.credit || 0);
  }

  // Fix floating point issues
  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;

  if (totalDebit !== totalCredit) {
    throw new Error(`Unbalanced journal entry: Debits ($${totalDebit}) do not equal Credits ($${totalCredit}).`);
  }
  
  if (totalDebit === 0) {
    return null; // Nothing to post
  }

  // Standard account mapping for auto-creation / fallback
  const STANDARD_ACCOUNTS = {
    '1000': { accountCode: '1000', accountName: 'Cash', type: 'Asset', normalBalance: 'Debit', isSystemAccount: true },
    '1010': { accountCode: '1010', accountName: 'Bank', type: 'Asset', normalBalance: 'Debit' },
    '1200': { accountCode: '1200', accountName: 'Accounts Receivable', type: 'Asset', normalBalance: 'Debit', isSystemAccount: true },
    '4000': { accountCode: '4000', accountName: 'Tuition Revenue', type: 'Revenue', normalBalance: 'Credit', isSystemAccount: true },
    '5100': { accountCode: '5100', accountName: 'Scholarship Expense', type: 'Expense', normalBalance: 'Debit', isSystemAccount: true },
  };

  // 2. Resolve Account IDs
  const resolvedLines = [];
  for (const line of lines) {
    let account = null;
    let querySession = session ? { session } : {};

    if (line.accountId) {
      account = await ChartOfAccount.findById(line.accountId, null, querySession);
    } else if (line.accountCode) {
      account = await ChartOfAccount.findOne({ accountCode: line.accountCode }, null, querySession);
    } else if (line.accountName) {
      // Fuzzy match or exact match on name
      const name = line.accountName.toLowerCase();
      let codeMatch = null;
      if (name.includes('cash')) codeMatch = '1000';
      else if (name.includes('bank')) codeMatch = '1010';
      else if (name.includes('receivable')) codeMatch = '1200';
      else if (name.includes('revenue') || name.includes('tuition')) codeMatch = '4000';
      else if (name.includes('scholarship')) codeMatch = '5100';

      if (codeMatch) {
        account = await ChartOfAccount.findOne({ accountCode: codeMatch }, null, querySession);
      }
      if (!account) {
        account = await ChartOfAccount.findOne({
          accountName: { $regex: new RegExp('^' + line.accountName + '$', 'i') }
        }, null, querySession);
      }
    }

    // Auto-create standard account if it does not exist yet
    if (!account && line.accountCode && STANDARD_ACCOUNTS[line.accountCode]) {
      const template = STANDARD_ACCOUNTS[line.accountCode];
      account = await ChartOfAccount.create([template], querySession).then(res => Array.isArray(res) ? res[0] : res);
    }

    if (!account) {
      // Create a generic account as fallback to ensure transaction does not fail
      const fallbackCode = line.accountCode || `ACC-${Date.now().toString().slice(-4)}`;
      const fallbackName = line.accountName || `Account ${fallbackCode}`;
      account = await ChartOfAccount.create([{
        accountCode: fallbackCode,
        accountName: fallbackName,
        type: Number(line.debit) > 0 ? 'Expense' : 'Revenue',
        normalBalance: Number(line.debit) > 0 ? 'Debit' : 'Credit',
      }], querySession).then(res => Array.isArray(res) ? res[0] : res);
    }

    resolvedLines.push({
      accountId: account._id,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      description: line.description || description,
      studentId: line.studentId,
    });
  }

  // 3. Create the Header — ensure journalNumber uniqueness by retrying with
  // suffixed variants if the provided journalNumber collides.
  const MAX_TRIES = 5;
  let savedHeader = null;
  let attempt = 0;
  let candidateJournalNumber = journalNumber;
  while (!savedHeader && attempt < MAX_TRIES) {
    attempt += 1;
    try {
      const header = new JournalEntry({
        journalNumber: candidateJournalNumber,
        date,
        referenceType,
        referenceId,
        description,
        status: 'Posted',
      });

      savedHeader = await header.save({ session });
    } catch (err) {
      // Duplicate key on journalNumber — try a suffixed alternative and retry.
      if (err && err.code === 11000 && candidateJournalNumber === journalNumber) {
        candidateJournalNumber = `${journalNumber}-${Date.now().toString().slice(-4)}`;
        continue;
      }
      // If it's a different error or retries exhausted, rethrow.
      throw err;
    }
  }
  if (!savedHeader) throw new Error('Failed to create unique journal entry header');

  // 4. Create the Lines
  const linesToSave = resolvedLines.map((line) => ({
    ...line,
    journalEntryId: savedHeader._id,
  }));

  await JournalLine.insertMany(linesToSave, { session });

  return savedHeader;
};
