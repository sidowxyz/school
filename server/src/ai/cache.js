import crypto from 'crypto';
import mongoose from 'mongoose';
import aiConfig from '../config/aiConfig.js';
import AiCache, { cacheTtlDate } from '../models/AiCache.js';
import AiUsage from '../models/AiUsage.js';
import { PROMPT_VERSION } from './prompts.js';

/**
 * Deterministic fingerprint of everything that could change an answer.
 *
 * Keys are sorted so argument order can't produce two entries for one question,
 * and PROMPT_VERSION is folded in so editing a prompt invalidates the cache
 * instead of serving results generated under the old wording.
 */
export const fingerprint = ({ tool, args, payload }) => {
  const canonical = JSON.stringify(
    { tool, args: args ?? {}, payload: payload ?? null, promptVersion: PROMPT_VERSION },
    (_key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value)
          .sort()
          .reduce((acc, k) => {
            acc[k] = value[k];
            return acc;
          }, {});
      }
      return value;
    }
  );

  return crypto.createHash('sha256').update(canonical).digest('hex');
};

/** Returns the cached result, or null. Never throws — a cache is an optimisation. */
export const readCache = async (key) => {
  try {
    const hit = await AiCache.findOneAndUpdate(
      { fingerprint: key, expiresAt: { $gt: new Date() } },
      { $inc: { hits: 1 } },
      { new: true }
    );
    return hit ? hit.result : null;
  } catch {
    return null;
  }
};

export const writeCache = async (key, tool, result) => {
  try {
    await AiCache.findOneAndUpdate(
      { fingerprint: key },
      {
        $set: {
          tool,
          promptVersion: PROMPT_VERSION,
          result,
          expiresAt: cacheTtlDate(),
        },
      },
      { upsert: true }
    );
  } catch {
    /* A failed cache write must never fail the user's request. */
  }
};

/** Fire-and-forget usage record. */
export const recordUsage = async ({ actor, tool, tier, usage, cachedHit = false }) => {
  try {
    await AiUsage.create({
      user_id: actor.id,
      role: actor.role,
      tool: tool ?? null,
      tier,
      promptTokens: usage?.promptTokens ?? 0,
      completionTokens: usage?.completionTokens ?? 0,
      cachedHit,
    });
  } catch {
    /* Accounting failure must not break the request. */
  }
};

/**
 * Whether the caller has spent their daily allowance.
 *
 * Only gates paid calls. A user over quota keeps full access to Level-0 tools,
 * which is most of the assistant — the cap removes phrasing, not function.
 */
export const isOverDailyQuota = async (actor) => {
  if (!aiConfig.dailyTokenQuota) return false;

  try {
    const since = new Date();
    since.setHours(0, 0, 0, 0);

    // $match does not cast, unlike a query — an unconverted string id would
    // match nothing and silently report zero usage, disabling the quota.
    const [row] = await AiUsage.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(actor.id),
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $add: ['$promptTokens', '$completionTokens'] } },
        },
      },
    ]);

    return (row?.total ?? 0) >= aiConfig.dailyTokenQuota;
  } catch {
    return false;
  }
};
