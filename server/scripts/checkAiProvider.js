#!/usr/bin/env node
/**
 * Diagnoses the configured AI provider key.
 *
 *   pnpm --dir server check:ai
 *
 * Prints what is wrong in plain terms and never prints the key itself, so the
 * output is safe to paste into a chat or an issue. The assistant deliberately
 * hides provider error detail from end users (the error body can echo the
 * request, which may contain school data), so this is the supported way to see
 * what the provider actually said.
 */
import dotenv from 'dotenv';

dotenv.config();

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';

const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const economy = process.env.AI_MODEL_ECONOMY || 'gemini-flash-latest';
const advanced = process.env.AI_MODEL_ADVANCED || 'gemini-pro-latest';

const line = (s = '') => console.log(s);

if (!key) {
  line('No GEMINI_API_KEY found in server/.env.');
  line('');
  line('The assistant still works without one — every data tool is a database');
  line('query. A key only adds narrative phrasing and assignment feedback.');
  process.exit(1);
}

line(`Key length : ${key.length}`);
line(`Key prefix : ${key.slice(0, 4)}…`);
line('');

// No shape check here on purpose. An earlier version warned that keys not
// beginning with "AIza" were invalid, then reported the same key accepted two
// lines later — Google issues more than one key format. Whether a key works is
// a question for the API, not for a prefix guess, so we just ask it.

const listed = await fetch(`${API_ROOT}/models`, {
  headers: { 'x-goog-api-key': key },
}).catch((err) => ({ ok: false, status: 0, statusText: err.message }));

if (!listed.ok) {
  let detail = '';
  try {
    const body = await listed.json();
    detail = body?.error?.message ?? '';
  } catch {
    /* ignore */
  }
  line(`✗ Key rejected (HTTP ${listed.status}). ${detail}`);
  line('');
  line('Most common causes: the key has been revoked, the Generative Language');
  line('API is not enabled on the project, or an OAuth access token was pasted');
  line('instead of an API key. Create one at https://aistudio.google.com/apikey');
  process.exit(1);
}

const body = await listed.json();
const usable = (body.models ?? [])
  .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
  .map((m) => m.name.replace(/^models\//, ''));

line('✓ Key accepted.');
line('');
line(`Models this key can use (${usable.length}):`);
for (const name of usable.slice(0, 25)) line(`   ${name}`);
if (usable.length > 25) line(`   … and ${usable.length - 25} more`);

line('');
for (const [tier, model] of [['economy', economy], ['advanced', advanced]]) {
  const ok = usable.includes(model);
  line(`${ok ? '✓' : '✗'} ${tier.padEnd(9)} "${model}"${ok ? '' : '  — NOT available to this key'}`);
}

const missing = [
  ['AI_MODEL_ECONOMY', economy],
  ['AI_MODEL_ADVANCED', advanced],
].filter(([, model]) => !usable.includes(model));

if (missing.length > 0) {
  line('');
  line('Fix: set these in server/.env to a model listed above, e.g.');
  for (const [varName] of missing) {
    line(`   ${varName}=${usable[0] ?? 'gemini-2.0-flash'}`);
  }
  process.exit(1);
}

line('');
line('Provider configuration looks good.');
