import mongoose from 'mongoose';
import aiConfig from '../config/aiConfig.js';

/**
 * Result cache keyed by a fingerprint of everything that could change the answer.
 *
 * The fingerprint includes the prompt version (see src/ai/prompts.js), so editing
 * a prompt invalidates cleanly instead of serving results generated under the old
 * wording. Cached entries expire, because school data moves underneath them.
 *
 * Only model-backed results are cached. Level-0 tools read the database directly
 * and are already cheap; caching them would serve stale numbers to save nothing.
 */
const aiCacheSchema = new mongoose.Schema(
  {
    fingerprint: { type: String, required: true, unique: true },
    tool: { type: String, required: true, index: true },
    promptVersion: { type: String, required: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
    hits: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

aiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AiCache = mongoose.model('AiCache', aiCacheSchema);

export const cacheTtlDate = () =>
  new Date(Date.now() + (aiConfig.cacheTtlMinutes ?? 60) * 60 * 1000);

export default AiCache;
