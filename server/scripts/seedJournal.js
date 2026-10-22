import connectDB from '../src/config/db.js';
import JournalEntry from '../src/models/JournalEntry.js';
import JournalLine from '../src/models/JournalLine.js';
import ChartOfAccount from '../src/models/ChartOfAccount.js';

(async () => {
  try {
    await connectDB();
    const cash = await ChartOfAccount.findOne({ accountName: 'Cash' }) || await ChartOfAccount.findOne();
    const revenue = await ChartOfAccount.findOne({ accountName: 'Tuition Revenue' }) || cash;

    const entry = await JournalEntry.create({
      journalNumber: `JE-${Date.now()}`,
      date: new Date(),
      referenceType: 'Manual',
      description: 'Seed journal entry for testing',
      status: 'Posted'
    });

    await JournalLine.insertMany([
      { journalEntryId: entry._id, accountId: cash._id, debit: 100, credit: 0, description: 'Seed debit' },
      { journalEntryId: entry._id, accountId: revenue._id, debit: 0, credit: 100, description: 'Seed credit' }
    ]);

    console.log('Seeded JournalEntry', entry._id.toString());
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed journal:', err);
    process.exit(1);
  }
})();
