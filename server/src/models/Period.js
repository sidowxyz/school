import mongoose from 'mongoose';

const periodSchema = new mongoose.Schema({
  // Periods are scoped to a term — one term might run 6 periods/day, another 7.
  termId: { type: mongoose.Schema.Types.ObjectId, ref: 'Term', required: true },
  per_no: { type: String, required: true },
  per_name: { type: String, required: true },
  time_in: { type: String, required: true },
  time_out: { type: String, required: true }
}, { timestamps: true });

// per_no only needs to be unique within its own term, not across the whole school.
periodSchema.index({ termId: 1, per_no: 1 }, { unique: true });

const Period = mongoose.model('Period', periodSchema);
export default Period;
