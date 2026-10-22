import mongoose from 'mongoose';
const { Schema } = mongoose;

const chartOfAccountSchema = new Schema(
  {
    accountCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'],
      required: true,
    },
    normalBalance: {
      type: String,
      enum: ['Debit', 'Credit'],
      required: true,
    },
    parentAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'ChartOfAccount',
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isSystemAccount: {
      type: Boolean,
      default: false, // Set to true for accounts like AR, AP, Retained Earnings that shouldn't be deleted manually
    },
    allowManualPosting: {
      type: Boolean,
      default: true, // Prevent manual journals to control accounts like AR
    },
  },
  { timestamps: true }
);

export default mongoose.model('ChartOfAccount', chartOfAccountSchema);
