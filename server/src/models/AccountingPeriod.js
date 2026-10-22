import mongoose from 'mongoose';
const { Schema } = mongoose;

const accountingPeriodSchema = new Schema(
  {
    periodName: {
      type: String,
      required: true, // e.g., "August 2026"
    },
    fiscalYearId: {
      type: Schema.Types.ObjectId,
      ref: 'FiscalYear',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Closed'],
      default: 'Open',
    },
    closedAt: {
      type: Date,
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Ensure periodName is unique within a fiscal year, though practically it should be globally unique
accountingPeriodSchema.index({ periodName: 1, fiscalYearId: 1 }, { unique: true });

export default mongoose.model('AccountingPeriod', accountingPeriodSchema);
