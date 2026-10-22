import mongoose from 'mongoose';

/**
 * A consequential action the assistant has prepared but NOT performed.
 *
 * This is the mechanism that makes "the model can never confirm on the user's
 * behalf" true in code. A CONFIRM-level tool does not execute; it writes one of
 * these and returns a preview. Execution requires a second, separately
 * authenticated HTTP request naming this document's id — so a model claiming
 * "the user approved" achieves nothing, because approval is a row in this
 * collection created by a real request, not a sentence in a transcript.
 *
 * Rows expire quickly: a stale approval is a security problem, and a preview
 * built from data that has since changed should be regenerated rather than run.
 */
const aiPendingActionSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    /** Role captured at preparation time; re-checked again at execution. */
    role: { type: String, required: true },

    tool: { type: String, required: true },

    /** Validated arguments, stored exactly as they will be executed. */
    args: { type: mongoose.Schema.Types.Mixed, default: {} },

    /**
     * Human-readable description of precisely what will happen, rendered to the
     * user before they confirm. Built server-side from real data — never from
     * model output — so what is shown is what runs.
     */
    preview: {
      title: { type: String, required: true },
      summary: { type: String, required: true },
      details: { type: mongoose.Schema.Types.Mixed, default: {} },
      /** e.g. "notify 412 people" — the consequence stated plainly. */
      impact: { type: String, default: '' },
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'failed'],
      default: 'pending',
      index: true,
    },

    resultRecordId: { type: String, default: null },
    error: { type: String, default: null },
    confirmedAt: { type: Date, default: null },

    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Mongo removes the document once expiresAt passes.
aiPendingActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/** Only a pending, unexpired action may be executed. */
aiPendingActionSchema.methods.isExecutable = function isExecutable() {
  return this.status === 'pending' && this.expiresAt > new Date();
};

const AiPendingAction = mongoose.model('AiPendingAction', aiPendingActionSchema);

export default AiPendingAction;
