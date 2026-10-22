import aiConfig from '../../config/aiConfig.js';
import AppError from '../../utils/AppError.js';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Gemini implementation of the AIProvider interface (see ./index.js).
 *
 * Uses `fetch` directly rather than the @google/generative-ai SDK: the request
 * shape needed here is a single POST, and avoiding the SDK keeps the promise
 * made in the audit that this feature adds no runtime dependency. Swapping in
 * the SDK later changes only this file.
 */

const buildBody = ({ system, messages, jsonSchema, tier }) => {
  const body = {
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      maxOutputTokens: aiConfig.maxOutputTokens[tier],
      temperature: 0.2,
    },
  };

  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  // Structured output: ask the model for JSON matching a schema rather than
  // parsing prose. The result is still re-validated with Zod by the caller —
  // provider-side schema enforcement is a convenience, not a trust boundary.
  if (jsonSchema) {
    body.generationConfig.responseMimeType = 'application/json';
    body.generationConfig.responseSchema = jsonSchema;
  }

  return body;
};

export const createGeminiProvider = () => ({
  name: 'gemini',

  async complete({ system, messages, jsonSchema, tier = 'economy' }) {
    if (!aiConfig.isLlmEnabled) {
      throw new AppError('No AI provider API key is configured on the server.', 503);
    }

    const model = aiConfig.models[tier];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), aiConfig.requestTimeoutMs);

    let response;
    try {
      response = await fetch(`${API_ROOT}/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': aiConfig.apiKey,
        },
        body: JSON.stringify(buildBody({ system, messages, jsonSchema, tier })),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AppError('The AI provider timed out. Please try again.', 504);
      }
      throw new AppError('Could not reach the AI provider.', 502);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // The provider's own message is logged server-side but never returned to
      // the client: the error body can echo the request, and the request may
      // contain school data. Only Google's short reason is taken, not the body.
      let reason = '';
      let retryDelay = '';
      try {
        const body = await response.json();
        reason = body?.error?.message ?? body?.error?.status ?? '';
        // Gemini attaches a RetryInfo detail with a concrete backoff (e.g.
        // "34s") on quota errors — worth surfacing verbatim instead of a
        // vague "try again shortly" when the provider actually told us.
        const retryInfo = (body?.error?.details ?? []).find((d) =>
          String(d?.['@type'] ?? '').endsWith('RetryInfo')
        );
        retryDelay = retryInfo?.retryDelay ?? '';
      } catch {
        /* non-JSON error body — status alone will have to do */
      }

      console.error(
        `[ai] Gemini ${response.status} on model "${model}" (${tier} tier): ${reason || '(no detail)'}`
      );

      if (response.status === 429) {
        // Distinguished from this server's own rate limit, which is also a 429
        // but means something completely different.
        const wait = retryDelay ? ` Try again in about ${retryDelay}.` : ' Please wait a few minutes and try again.';
        const err = new AppError(
          `The AI provider's free-tier quota for "${model}" is exhausted right now.${wait}`,
          429
        );
        err.providerQuota = true;
        err.exhaustedModel = model;
        throw err;
      }
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new AppError(
          'The AI provider rejected the request — the API key looks invalid or lacks access. Check GEMINI_API_KEY in server/.env; the server log has the provider\'s reason.',
          502
        );
      }
      if (response.status === 404) {
        throw new AppError(
          `The AI model "${model}" is not available for this API key. Set AI_MODEL_ECONOMY / AI_MODEL_ADVANCED in server/.env to a model your key can use.`,
          502
        );
      }
      throw new AppError('The AI provider returned an error. See the server log for details.', 502);
    }

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    const usageRaw = payload?.usageMetadata ?? {};

    return {
      text,
      usage: {
        promptTokens: usageRaw.promptTokenCount ?? 0,
        completionTokens: usageRaw.candidatesTokenCount ?? 0,
      },
    };
  },
});
