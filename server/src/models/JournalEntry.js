import mongoose from 'mongoose';
const { Schema } = mongoose;

const journalEntrySchema = new Schema(
  {
    journalNumber: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    referenceType: {
      type: String, // e.g., 'Invoice', 'Payment', 'Expense', 'Scholarship', 'Manual'
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId, // Refers to the specific invoice, payment, etc.
      required: false,
    },
    description: {
      type: String,
      required: true,
    },
    fiscalYearId: {
      type: Schema.Types.ObjectId,
      ref: 'FiscalYear',
      required: false,
    },
    accountingPeriodId: {
      type: Schema.Types.ObjectId,
      ref: 'AccountingPeriod',
      required: false,
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending Approval', 'Approved', 'Posted', 'Reversed'],
      default: 'Posted',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    postedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('JournalEntry', journalEntrySchema);
