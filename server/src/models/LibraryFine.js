import mongoose from 'mongoose';

const libraryFineSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  staff_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  issue_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'BookIssue', required: true },
  amount:     { type: Number, required: true, min: 0 },
  reason:     { type: String, default: 'Overdue return' },
  status: {
    type: String,
    enum: ['unpaid', 'paid', 'waived'],
    default: 'unpaid'
  },
  registerBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updateBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: { createdAt: 'registerDate', updatedAt: 'updateDate' }
});

libraryFineSchema.index({ student_id: 1, status: 1 });
libraryFineSchema.index({ staff_id: 1, status: 1 });

const LibraryFine = mongoose.model('LibraryFine', libraryFineSchema);
export default LibraryFine;
