import mongoose from 'mongoose';

/**
 * Ledger model — double-entry accounting journal.
 *
 * Every financial event (payment received, scholarship discount applied) posts
 * at least two rows: one debit and one credit, so total debits always equal
 * total credits across the entire ledger.
 */
const ledgerSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  accountName: {
    type: String,
    required: [true, 'Account name is required.'],
    trim: true,
    default: 'Cash in Hand'
  },
  referenceNo: {
    type: String,
    required: [true, 'Reference number is required.']
  },
  description: {
    type: String,
    default: ''
  },
  debit: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  credit: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

ledgerSchema.index({ date: -1 });
ledgerSchema.index({ accountName: 1 });
ledgerSchema.index({ referenceNo: 1 });

const Ledger = mongoose.model('Ledger', ledgerSchema);
export default Ledger;
