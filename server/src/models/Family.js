import mongoose from 'mongoose';

const familySchema = new mongoose.Schema({
  familyName: {
    type: String,
    required: true,
  },
  primaryContactPhone: {
    type: String,
    required: true,
  },
  primaryContactEmail: {
    type: String,
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
  },
  siblingCount: {
    type: Number,
    default: 0,
  },
  discountTier: {
    type: String,
    enum: ['None', 'Tier 1 (2 siblings)', 'Tier 2 (3+ siblings)'],
    default: 'None',
  },
}, { timestamps: true });

const Family = mongoose.model('Family', familySchema);
export default Family;
