import { tokenize } from '../utils/textSimilarity.js';

/**
 * Deterministic intent matching by vocabulary overlap.
 *
 * The original router used fixed regex patterns, which matched only 7 of 19
 * realistic phrasings — "who owes money" and "books not returned" both fell
 * through. With no provider key there was no fallback, so the assistant looked
 * like it only accepted button presses.
 *
 * This scores the question against each tool's declared vocabulary instead.
 * It reuses the tokenizer from utils/textSimilarity, so stopwords, plurals and
 * school synonyms are already handled: "teachers" and "teacher" collapse,
 * as do "list" and "state".
 *
 * Two guards keep it honest, because silently answering the *wrong* question is
 * worse than admitting no match:
 *   - a minimum score, so vague input matches nothing
 *   - a margin over the runner-up, so genuinely ambiguous input matches nothing
 */

const MIN_SCORE = 0.34;
const MIN_MARGIN = 0.08;

/** Terms so common across tools that matching on them means nothing. */
const WEAK_TERMS = new Set(['school', 'student', 'show', 'get', 'list', 'state', 'give', 'many', 'much', 'total']);

const indexCache = new Map();

const indexFor = (tool) => {
  if (indexCache.has(tool.name)) return indexCache.get(tool.name);

  // Split the camelCase tool name into words so "getMissingTeachingLogs" contributes
  // "missing", "teaching" and "logs" rather than one meaningless token.
  const nameWords = tool.name.replace(/([A-Z])/g, ' $1');
  const tokens = new Set(tokenize(`${nameWords} ${tool.keywords ?? ''}`));

  indexCache.set(tool.name, tokens);
  return tokens;
};

const scoreTool = (queryTokens, tool) => {
  const toolTokens = indexFor(tool);
  if (toolTokens.size === 0 || queryTokens.length === 0) return 0;

  let matched = 0;
  let strong = 0;
  for (const token of queryTokens) {
    if (!toolTokens.has(token)) continue;
    matched += 1;
    if (!WEAK_TERMS.has(token)) strong += 1;
  }

  if (strong === 0) return 0; // only generic words overlapped — not a match

  // Coverage of what the user actually said, nudged by how many of the
  // overlapping terms were distinctive.
  const coverage = matched / queryTokens.length;
  const specificity = strong / matched;
  return Math.round((coverage * 0.65 + specificity * 0.35) * 1000) / 1000;
};

/**
 * Best tool for a question, or null.
 * `tools` must already be filtered to what the caller's role may use.
 */
export const matchByVocabulary = (message, tools) => {
  const queryTokens = tokenize(message);
  if (queryTokens.length === 0 || tools.length === 0) return null;

  const ranked = tools
    .map((tool) => ({ tool, score: scoreTool(queryTokens, tool) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return null;

  const [best, runnerUp] = ranked;
  if (best.score < MIN_SCORE) return null;
  if (runnerUp && best.score - runnerUp.score < MIN_MARGIN) return null;

  return best.tool.name;
};

/** Test seam — the index is memoised per tool name. */
export const __clearMatcherCache = () => indexCache.clear();
