import mongoose from 'mongoose';

/**
 * ReadingSession — reading_sessions collection
 * Tracks in-library reading sessions for students.
 * Records when a student reads a book inside the library
 * (not borrowed), including time-out and hours read.
 */
const readingSessionSchema = new mongoose.Schema({
  st_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  book_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: [true, 'Book ID is required']
  },
  // status: reading | completed | interrupted
  status: {
    type: String,
    enum: ['reading', 'completed', 'interrupted'],
    default: 'reading'
  },
  // Time the student finished / left (check-out time)
  timeOut: {
    type: Date,
    default: null
  },
  // Total hours spent reading (calculated or entered manually)
  hoursRead: {
    type: Number,
    min: [0, 'Hours read cannot be negative'],
    default: 0
  },
  registerBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updateBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: { createdAt: 'registerDate', updatedAt: 'updateDate' }
});

// Indexes for fast lookup
readingSessionSchema.index({ st_id: 1, status: 1 });
readingSessionSchema.index({ book_id: 1 });
readingSessionSchema.index({ registerDate: -1 });

const ReadingSession = mongoose.model('ReadingSession', readingSessionSchema);
export default ReadingSession;
