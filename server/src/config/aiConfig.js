/**
 * Central, validated configuration for the AI assistant.
 *
 * The rest of the server reads scattered `process.env.X` values directly. That is
 * tolerable for a Mongo URI that fails loudly on connect, but an AI provider key
 * that is merely absent would otherwise surface as a confusing runtime 500 on the
 * first user question. So AI config is resolved and validated in one place here,
 * and every AI code path reads from this object rather than from `process.env`.
 *
 * Deliberate design choice: a missing API key is NOT a boot failure. Ten of the
 * twelve Phase 1 tools are deterministic database aggregations that need no model
 * at all, so the assistant stays genuinely useful without a key. `isLlmEnabled`
 * lets those paths run while narrative/LLM features degrade with a clear message.
 */

const TIERS = ['economy', 'advanced'];

/**
 * Rolling aliases rather than pinned versions.
 *
 * Which concrete models a key can reach varies by project, region and tier —
 * a pinned default that works on one key 404s on another, and the model list
 * moves faster than this file will. The "-latest" aliases are the portable
 * choice. Pin a specific version with AI_MODEL_ECONOMY / AI_MODEL_ADVANCED if
 * you need reproducibility; `npm run check:ai` lists what your key can use.
 */
const DEFAULT_MODELS = {
  gemini: {
    economy: 'gemini-flash-latest',
    advanced: 'gemini-pro-latest',
  },
};

const readKey = (provider) => {
  switch (provider) {
    case 'gemini':
      return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    default:
      return '';
  }
};

const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const apiKey = readKey(provider);

const aiConfig = {
  provider,
  apiKey,

  /**
   * True only when a provider key is actually present. Guards every code path
   * that would otherwise make a paid network call.
   */
  isLlmEnabled: Boolean(apiKey),

  models: {
    economy: process.env.AI_MODEL_ECONOMY || DEFAULT_MODELS[provider]?.economy || '',
    advanced: process.env.AI_MODEL_ADVANCED || DEFAULT_MODELS[provider]?.advanced || '',
  },

  /** Hard ceiling on generated tokens per tier — the primary cost guard. */
  maxOutputTokens: {
    economy: Number(process.env.AI_MAX_OUTPUT_ECONOMY) || 800,
    advanced: Number(process.env.AI_MAX_OUTPUT_ADVANCED) || 2000,
  },

  /** Abort a provider call that hangs, so a user request can never wedge. */
  requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS) || 30000,

  /** Verbatim turns kept per conversation before older ones are summarized away. */
  conversationTurnWindow: Number(process.env.AI_CONVERSATION_WINDOW) || 8,

  /** Conversations expire so transcripts are not retained indefinitely. */
  conversationTtlDays: Number(process.env.AI_CONVERSATION_TTL_DAYS) || 30,

  /** How long a cached model result stays valid before school data drifts. */
  cacheTtlMinutes: Number(process.env.AI_CACHE_TTL_MINUTES) || 60,

  /**
   * Minutes a prepared consequential action stays confirmable. Short on
   * purpose: a stale approval is a security problem, and a preview built from
   * data that has since changed should be regenerated rather than executed.
   */
  pendingActionTtlMinutes: Number(process.env.AI_PENDING_ACTION_TTL_MINUTES) || 10,

  /** Daily per-user token ceiling. 0 disables the quota. */
  dailyTokenQuota: Number(process.env.AI_DAILY_TOKEN_QUOTA) || 100000,

  rateLimit: {
    windowMs: Number(process.env.AI_RATE_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.AI_RATE_MAX) || 60,
  },
};

/**
 * Validate at import time. Throws only on genuinely broken configuration —
 * an unknown provider or a key present with no model resolved — never on the
 * ordinary "no key configured yet" case.
 */
const validate = (cfg) => {
  const supported = ['gemini', 'openai', 'anthropic'];
  if (!supported.includes(cfg.provider)) {
    throw new Error(
      `[aiConfig] AI_PROVIDER="${cfg.provider}" is not supported. Expected one of: ${supported.join(', ')}.`
    );
  }
  if (cfg.isLlmEnabled) {
    for (const tier of TIERS) {
      if (!cfg.models[tier]) {
        throw new Error(
          `[aiConfig] Provider "${cfg.provider}" has an API key but no ${tier} model. ` +
            `Set AI_MODEL_${tier.toUpperCase()}.`
        );
      }
    }
  }
  return cfg;
};

export default validate(aiConfig);
