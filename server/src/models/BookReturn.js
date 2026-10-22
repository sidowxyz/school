import mongoose from 'mongoose';

const bookReturnSchema = new mongoose.Schema({
  issue_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'BookIssue', required: true },
  return_date: { type: Date, required: true, default: Date.now },
  late_days:   { type: Number, default: 0 },
  fine_amount: { type: Number, default: 0 },
  registerBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updateBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: { createdAt: 'registerDate', updatedAt: 'updateDate' }
});

bookReturnSchema.index({ issue_id: 1 });

const BookReturn = mongoose.model('BookReturn', bookReturnSchema);
export default BookReturn;
