import mongoose from 'mongoose';

/**
 * Per-call token accounting.
 *
 * Exists so cost is measurable before it is a surprise, and so a per-user daily
 * quota can be enforced without guessing. `cachedHit` and `tier: 'none'` rows
 * record work that cost nothing — those are the rows that show the routing
 * strategy is doing its job.
 */
const aiUsageSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, required: true },
    tool: { type: String, default: null },
    tier: { type: String, enum: ['none', 'economy', 'advanced'], required: true },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    cachedHit: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Supports "how many tokens has this user spent today" without a scan.
aiUsageSchema.index({ user_id: 1, createdAt: -1 });

const AiUsage = mongoose.model('AiUsage', aiUsageSchema);

export default AiUsage;
