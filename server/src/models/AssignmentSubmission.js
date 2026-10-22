import mongoose from 'mongoose';

/**
 * A student's assignment text, kept for exactly one reason: comparing a new
 * submission against a student's own writing history is the strongest,
 * fairest signal the writing-integrity review has — stronger and fairer than
 * any absolute measure, because it's relative to that individual rather than
 * a population norm that may not fit them. That comparison needs somewhere to
 * read "the student's earlier work" from, which nothing in this codebase
 * currently stores.
 *
 * Deliberately not a general "assignment" domain model — no submission
 * portal, no due dates, no grading workflow. Those would be a real product
 * decision belonging to whoever owns the assignments feature, not something
 * to invent as a side effect of adding a review tool. This is a text archive.
 *
 * `styleFingerprint` is stored pre-computed (see utils/writingStyleSignals.js)
 * so comparing against N earlier submissions is N cheap reads, not N
 * recomputations from raw text on every review.
 */
const assignmentSubmissionSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    assignmentTitle: { type: String, default: '', trim: true, maxlength: 200 },
    rubric: { type: String, default: '', trim: true, maxlength: 4000 },

    submittedText: { type: String, required: true },
    wordCount: { type: Number, required: true },
    fileName: { type: String, default: '' },

    styleFingerprint: {
      wordCount: Number,
      sentenceCount: Number,
      avgSentenceLength: Number,
      sentenceLengthStdDev: Number,
      vocabularyRichness: Number,
      avgWordLength: Number,
    },
  },
  { timestamps: true }
);

assignmentSubmissionSchema.index({ studentId: 1, createdAt: -1 });

const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);

export default AssignmentSubmission;
