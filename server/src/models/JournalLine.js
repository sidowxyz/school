import mongoose from 'mongoose';
const { Schema } = mongoose;

const journalLineSchema = new Schema(
  {
    journalEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'JournalEntry',
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      required: true,
      index: true,
    },
    debit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    credit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: '',
    },
    // Optional, for granular reporting
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: false,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('JournalLine', journalLineSchema);
