import mongoose from 'mongoose';

const guardianSchema = new mongoose.Schema({
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Optional portal access user
  },
  name: {
    type: String,
    required: true,
  },
  relationship: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
  p_no: {
    type: String,
    default: null,
  }
}, { timestamps: true });

const Guardian = mongoose.model('Guardian', guardianSchema);
export default Guardian;