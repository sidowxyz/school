import aiConfig from '../../config/aiConfig.js';
import AppError from '../../utils/AppError.js';
import { createGeminiProvider } from './geminiProvider.js';

/**
 * Provider abstraction.
 *
 * Every provider implements a single method:
 *
 *   complete({ system, messages, jsonSchema, tier }) -> { text, usage }
 *
 *     system     string  — system instruction
 *     messages   [{ role: 'user' | 'assistant', content: string }]
 *     jsonSchema object  — optional; request structured output
 *     tier       'economy' | 'advanced' — selects model + token ceiling
 *
 * Nothing outside this directory imports a vendor SDK or knows the vendor's
 * request shape. Adding OpenAI or Anthropic later means adding one file here
 * and one entry in the registry below — no change to tools, orchestrator or UI.
 */

const REGISTRY = {
  gemini: createGeminiProvider,
  // openai:    createOpenAiProvider,     // not implemented — no key configured
  // anthropic: createAnthropicProvider,  // not implemented — no key configured
};

let cached = null;

export const getProvider = () => {
  if (cached) return cached;

  const factory = REGISTRY[aiConfig.provider];
  if (!factory) {
    throw new AppError(
      `AI provider "${aiConfig.provider}" is configured but not implemented on this server.`,
      500
    );
  }

  cached = factory();
  return cached;
};

/** Test seam — lets suites inject a fake provider without touching env. */
export const __setProviderForTests = (provider) => {
  cached = provider;
};
