import mongoose from 'mongoose';
import { normalizeText, textFingerprint } from '../utils/textSimilarity.js';

/**
 * A single question, banked with the metadata needed to find it again.
 *
 * The point of storing questions separately from Exam is repetition detection:
 * the existing Exam model records that a paper happened, not what was on it, so
 * there is nothing to compare a new question against. This is that archive.
 *
 * `normalizedText` and `fingerprint` are maintained by a pre-validate hook so
 * exact-duplicate detection is an indexed lookup rather than a scan, and can
 * never drift from `text`.
 */
const examQuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 4000 },

    /** Lowercased, punctuation-stripped form. Derived — never set directly. */
    normalizedText: { type: String, required: true, index: true },

    /** sha256 of normalizedText. Two questions sharing this are verbatim copies. */
    fingerprint: { type: String, required: true, index: true },

    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null, index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },

    /** Denormalized for reporting, since papers outlive class/subject renames. */
    subjectName: { type: String, default: '' },
    className: { type: String, default: '' },

    academicYear: { type: String, default: '' },
    term: { type: String, default: '' },
    examType: { type: String, default: '' },

    topic: { type: String, default: '', trim: true, index: true },
    marks: { type: Number, default: 0, min: 0 },
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'hard', 'unspecified'],
      default: 'unspecified',
    },
    questionType: {
      type: String,
      enum: ['short-answer', 'essay', 'multiple-choice', 'calculation', 'unspecified'],
      default: 'unspecified',
    },

    /**
     * Reserved for a vector backend. Deliberately unused today: similarity runs
     * deterministically (see utils/textSimilarity.js), which needs no API key.
     * When embeddings are configured they should add a signal alongside the
     * lexical score, not replace it.
     */
    embedding: { type: [Number], default: undefined, select: false },

    createBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Retrieval is always scoped before scoring — the archive is never loaded whole.
examQuestionSchema.index({ subjectId: 1, classId: 1, createdAt: -1 });

examQuestionSchema.pre('validate', function syncDerivedText(next) {
  if (this.isModified('text') || !this.fingerprint) {
    this.normalizedText = normalizeText(this.text);
    this.fingerprint = textFingerprint(this.text);
  }
  next();
});

const ExamQuestion = mongoose.model('ExamQuestion', examQuestionSchema);

export default ExamQuestion;
