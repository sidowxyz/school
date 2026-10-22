import mongoose from 'mongoose';

const termSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  academicYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Year',
    required: true
  },
  startDate: { type: Date },
  endDate:   { type: Date },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  // Which weekdays actually hold classes this term — e.g. Friday off is common.
  // Defaults to a Saturday-Thursday week (Friday off).
  workingDays: {
    type: [{ type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    default: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  },
}, { timestamps: true });

// Unique index: prevent duplicate term name within same academic year
termSchema.index({ name: 1, academicYearId: 1 }, { unique: true });

const Term = mongoose.model('Term', termSchema);
export default Term;
