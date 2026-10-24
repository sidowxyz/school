/**
 * Builds the *only* representation of the current user that AI code is allowed
 * to see.
 *
 * This exists because `authenticate` sets `req.user` to the full Mongoose User
 * document, which carries `password` (bcrypt hash), `refreshToken` (SHA-256 hash
 * of the live refresh token), and the password-reset fields. Spreading that into
 * prompt context — even accidentally, even nested inside a tool result — would
 * ship credential material to a third-party model provider.
 *
 * So: nothing in src/ai/ ever reads `req.user` directly. It reads the actor.
 * There is an integration test asserting that no serialized prompt payload
 * contains those field names.
 */

const ALLOWED_FIELDS = ['id', 'role', 'firstName', 'lastName'];

export const buildActor = (reqUser) => {
  if (!reqUser) return null;

  return Object.freeze({
    id: reqUser._id?.toString() ?? reqUser.id?.toString() ?? null,
    role: reqUser.role,
    firstName: reqUser.firstName ?? '',
    lastName: reqUser.lastName ?? '',
    get displayName() {
      return `${this.firstName} ${this.lastName}`.trim() || 'User';
    },
  });
};

/**
 * Defence in depth: strip anything credential-shaped before a payload is handed
 * to a provider. `buildActor` should already have prevented this, but tool
 * results come from existing services that were not written with prompts in
 * mind and may populate a `userId` ref into a full user document.
 */
const REDACT_KEYS = new Set([
  'password',
  'refreshToken',
  'refreshTokens',
  'passwordResetToken',
  'passwordResetExpires',
  '__v',
]);

export const redactForPrompt = (value, depth = 0) => {
  if (depth > 8 || value == null) return value;

  if (Array.isArray(value)) {
    return value.map((v) => redactForPrompt(v, depth + 1));
  }

  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'object') {
    // Mongoose documents serialize their internals otherwise.
    const plain = typeof value.toObject === 'function' ? value.toObject() : value;
    const out = {};
    for (const [key, val] of Object.entries(plain)) {
      if (REDACT_KEYS.has(key)) continue;
      out[key] = redactForPrompt(val, depth + 1);
    }
    return out;
  }

  return value;
};

export const ACTOR_FIELDS = ALLOWED_FIELDS;
