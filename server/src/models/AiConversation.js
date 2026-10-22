import mongoose from 'mongoose';
import aiConfig from '../config/aiConfig.js';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    /** Tool that produced this turn, when there was one. */
    tool: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const aiConversationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true },
    title: { type: String, default: 'New conversation' },

    /**
     * Only the most recent turns are kept verbatim (aiConfig.conversationTurnWindow).
     * Older turns are folded into `rollingSummary` so context stays cheap and
     * bounded — a long thread never grows the per-request token cost.
     */
    messages: { type: [messageSchema], default: [] },
    rollingSummary: { type: String, default: '' },

    /** Whitelisted page context only — { pageType, entityId }, never page state. */
    pageContext: {
      pageType: { type: String, default: null },
      entityId: { type: String, default: null },
    },

    // Indexed via schema.index() below (with the TTL option) — declaring
    // `index: true` here as well would create a duplicate index.
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Transcripts are not retained indefinitely. TTL is measured from last activity,
// so an active thread survives and an abandoned one expires.
aiConversationSchema.index(
  { lastActivityAt: 1 },
  { expireAfterSeconds: aiConfig.conversationTtlDays * 24 * 60 * 60 }
);

/** Append a turn, trimming the verbatim window. */
aiConversationSchema.methods.appendTurn = function appendTurn(role, content, tool = null) {
  this.messages.push({ role, content, tool });

  const window = aiConfig.conversationTurnWindow;
  if (this.messages.length > window) {
    const dropped = this.messages.slice(0, this.messages.length - window);
    this.messages = this.messages.slice(-window);

    // Cheap extractive summary — no model call. Enough to preserve continuity
    // ("we were discussing Grade 8 fees") without paying to compress history.
    const gist = dropped
      .filter((m) => m.role === 'user')
      .map((m) => m.content.slice(0, 120))
      .join(' | ');
    if (gist) {
      this.rollingSummary = `${this.rollingSummary} ${gist}`.trim().slice(-1200);
    }
  }

  this.lastActivityAt = new Date();
  return this;
};

const AiConversation = mongoose.model('AiConversation', aiConversationSchema);

export default AiConversation;
