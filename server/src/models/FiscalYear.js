import mongoose from 'mongoose';
const { Schema } = mongoose;

const fiscalYearSchema = new Schema(
  {
    yearName: {
      type: String,
      required: true,
      unique: true, // e.g., "2026/2027"
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

export default mongoose.model('FiscalYear', fiscalYearSchema);
