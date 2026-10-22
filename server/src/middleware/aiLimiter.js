import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import aiConfig from '../config/aiConfig.js';

/**
 * The global /api limiter is 2000 req/15min — deliberately loose because
 * dashboards fan out many parallel reads. That ceiling is far too high for a
 * path that can make paid provider calls, so the assistant gets its own,
 * mirroring the pattern already used for credential endpoints in authRoutes.js.
 *
 * Keyed by user id rather than IP: a whole school behind one NAT would
 * otherwise share a single budget.
 */
export const aiLimiter = rateLimit({
  windowMs: aiConfig.rateLimit.windowMs,
  max: aiConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  // ipKeyGenerator normalises IPv6 into a /64 subnet key; using req.ip raw
  // would let a single IPv6 client rotate addresses to evade the limit.
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: 'You have made a lot of assistant requests. Please wait a few minutes and try again.',
  },
});

export default aiLimiter;
