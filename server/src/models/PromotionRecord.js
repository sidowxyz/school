import mongoose from 'mongoose';

/**
 * One student's movement between classes, kept as a permanent audit trail.
 *
 * Every promotion writes one of these — normal, special or retained — so the
 * school can always answer "who moved this student, when, and why". Special
 * promotions (skipping the consecutive class) additionally require a reason,
 * which is what makes arbitrary class-jumping traceable rather than silent.
 */
const promotionRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required']
  },

  // normal    — moved into the next class in the hierarchy
  // special   — moved into a non-consecutive class, with a reason
  // retained  — kept in the same class for another year
  // graduated — completed the final class
  type: {
    type: String,
    enum: ['normal', 'special', 'retained', 'graduated'],
    required: true
  },

  from_class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  // Null for classes that aren't streamed into sections.
  from_section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    default: null
  },
  // Null when the student graduated out of the school.
  to_class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  to_section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    default: null
  },

  academic_year: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Year'
  },

  // Required for 'special' — enforced in promotionService, which has the
  // context to explain why.
  reason: {
    type: String,
    trim: true
  },

  // The exam result the decision was based on, when there was one.
  percentage: {
    type: Number
  },

  // Groups the records written by one class-wide promotion run.
  batch_id: {
    type: String
  },

  performed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'The staff member performing the promotion is required']
  },
  performed_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

promotionRecordSchema.index({ student: 1, performed_at: -1 });
promotionRecordSchema.index({ batch_id: 1 });

const PromotionRecord = mongoose.model('PromotionRecord', promotionRecordSchema);
export default PromotionRecord;
