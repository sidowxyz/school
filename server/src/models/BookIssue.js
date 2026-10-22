import mongoose from 'mongoose';

const bookIssueSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  staff_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  book_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  issue_date: { type: Date, required: true, default: Date.now },
  expected_return_date: { type: Date, required: true },
  status: {
    type: String,
    enum: ['issued', 'returned', 'overdue'],
    default: 'issued'
  },
  registerBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updateBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: { createdAt: 'registerDate', updatedAt: 'updateDate' }
});

bookIssueSchema.index({ student_id: 1, status: 1 });
bookIssueSchema.index({ staff_id: 1, status: 1 });
bookIssueSchema.index({ book_id: 1 });

const BookIssue = mongoose.model('BookIssue', bookIssueSchema);
export default BookIssue;
