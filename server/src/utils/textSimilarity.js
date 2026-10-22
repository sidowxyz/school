import crypto from 'crypto';

/**
 * Deterministic text similarity for exam questions.
 *
 * This runs with no model and no API key. That is a deliberate choice rather
 * than a stopgap: repetition between exam papers is overwhelmingly lexical —
 * the same concept re-asked with a different command verb — and that pattern is
 * detectable without inference. A model is neither necessary nor more reliable
 * here, and would make a cheap, instant check slow and billable.
 *
 * The pipeline is: normalize -> drop stopwords -> canonicalize exam vocabulary
 * -> compare. Comparison blends token overlap (word choice) with character
 * trigram overlap (word forms), so neither reordering nor small inflection
 * changes alone defeat it.
 *
 * `embedding` fields are reserved on ExamQuestion for a future vector backend.
 * When one is configured it should *add* a signal to `scoreQuestions`, not
 * replace this one — a deterministic floor is worth keeping.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with', 'from',
  'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'that', 'this', 'these', 'those', 'it', 'its', 'as', 'you', 'your',
  'do', 'does', 'did', 'can', 'could', 'should', 'would', 'may', 'might',
  'following', 'below', 'above', 'given', 'question', 'answer', 'marks', 'mark',
]);

/**
 * Exam command verbs and stems that mean the same thing for repetition
 * purposes. "Explain three causes" and "describe three factors" are the same
 * question; a plain lexical comparison would score them far apart.
 */
const SYNONYMS = new Map(
  Object.entries({
    // command verbs
    describe: 'explain', discuss: 'explain', outline: 'explain', elaborate: 'explain',
    clarify: 'explain', illustrate: 'explain', account: 'explain',
    list: 'state', name: 'state', mention: 'state', identify: 'state', give: 'state',
    write: 'state', enumerate: 'state',
    define: 'define', meaning: 'define', definition: 'define',
    calculate: 'calculate', compute: 'calculate', work: 'calculate', find: 'calculate',
    determine: 'calculate', evaluate: 'calculate', solve: 'calculate',
    compare: 'compare', contrast: 'compare', differentiate: 'compare',
    distinguish: 'compare', difference: 'compare', differences: 'compare',

    // nouns that recur as interchangeable framings
    cause: 'factor', causes: 'factor', factors: 'factor', reason: 'factor',
    reasons: 'factor', responsible: 'factor',
    effect: 'effect', effects: 'effect', impact: 'effect', impacts: 'effect',
    consequence: 'effect', consequences: 'effect', result: 'effect', results: 'effect',
    advantage: 'advantage', advantages: 'advantage', benefit: 'advantage',
    benefits: 'advantage', merit: 'advantage', merits: 'advantage',
    disadvantage: 'disadvantage', disadvantages: 'disadvantage',
    demerit: 'disadvantage', demerits: 'disadvantage', drawback: 'disadvantage',
    function: 'function', functions: 'function', role: 'function', roles: 'function',
    purpose: 'function', use: 'function', uses: 'function',
    type: 'type', types: 'type', kind: 'type', kinds: 'type', form: 'type', forms: 'type',
    example: 'example', examples: 'example', instance: 'example', instances: 'example',
    importance: 'importance', significance: 'importance',
    process: 'process', procedure: 'process', method: 'process', way: 'process', ways: 'process',
    characteristic: 'feature', characteristics: 'feature', feature: 'feature',
    features: 'feature', property: 'feature', properties: 'feature',
  })
);

/** Number words, so "three causes" and "3 causes" agree. */
const NUMBER_WORDS = new Map(
  Object.entries({
    one: '1', two: '2', three: '3', four: '4', five: '5',
    six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  })
);

/**
 * Light suffix stripping. Not a real stemmer — Porter would be overkill and
 * introduces its own false merges. This handles the plural/participle endings
 * that actually show up in exam wording.
 */
const stem = (word) => {
  if (word.length <= 3) return word;
  for (const suffix of ['ational', 'ization', 'iveness', 'ements', 'ement', 'ingly', 'edly']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  return word;
};

/** Lowercase, strip punctuation and collapse whitespace. */
export const normalizeText = (text) =>
  String(text ?? '')
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Stable hash of normalized text — the exact-duplicate key. */
export const textFingerprint = (text) =>
  crypto.createHash('sha256').update(normalizeText(text)).digest('hex');

/** Normalized, stopword-free, synonym-canonicalized, stemmed tokens. */
export const tokenize = (text) => {
  const tokens = [];
  for (const raw of normalizeText(text).split(' ')) {
    if (!raw) continue;
    const numeric = NUMBER_WORDS.get(raw) ?? raw;
    if (STOPWORDS.has(numeric)) continue;
    const canonical = SYNONYMS.get(numeric) ?? numeric;
    const stemmed = SYNONYMS.get(stem(canonical)) ?? stem(canonical);
    if (stemmed) tokens.push(stemmed);
  }
  return tokens;
};

const dice = (a, b) => {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return (2 * shared) / (a.size + b.size);
};

/**
 * Opposed concept pairs.
 *
 * These are the case where lexical overlap actively misleads: "advantages of
 * nuclear energy" and "disadvantages of nuclear energy" share almost every word
 * and every character trigram — "disadvantage" even contains "advantage" — yet
 * they are opposite questions that both belong on a paper. Without this check
 * the comparison scored them 0.81, a confident false positive.
 */
const POLARITY_PAIRS = [
  ['advantage', 'disadvantage'],
  ['similarity', 'difference'],
  ['importance', 'limitation'],
  ['strength', 'weakness'],
  ['benefit', 'harm'],
];

/**
 * Read polarity from the raw normalized text, deliberately NOT from the
 * canonical tokens: the synonym map collapses "differences" into "compare",
 * which would erase the very signal being looked for. Checking the original
 * wording keeps this independent of how the tokenizer is tuned.
 */
const polarityOf = (text) => {
  const words = normalizeText(text).split(' ');

  // Prefix match on the word, not a substring match on the sentence: plurals
  // and adjective forms have to count ("similarities" for "similarity",
  // "harmful" for "harm"), and a raw substring test misses all of them.
  const has = (term) => {
    const prefix = term.slice(0, 7);
    return words.some((word) => word.startsWith(prefix));
  };

  const found = new Set();
  for (const [positive, negative] of POLARITY_PAIRS) {
    // Check the negative first: "disadvantage" also starts with... nothing
    // shared, but "harm"/"harmful" style overlaps make order matter generally.
    if (has(negative)) found.add(`-${positive}`);
    else if (has(positive)) found.add(`+${positive}`);
  }
  return found;
};

/** True when the two texts take opposite sides of the same concept. */
const polarityConflict = (textA, textB) => {
  const a = polarityOf(textA);
  const b = polarityOf(textB);
  for (const sign of a) {
    const flipped = sign.startsWith('+') ? `-${sign.slice(1)}` : `+${sign.slice(1)}`;
    if (b.has(flipped)) return true;
  }
  return false;
};

const trigrams = (text) => {
  const padded = ` ${normalizeText(text)} `;
  const grams = new Set();
  for (let i = 0; i < padded.length - 2; i += 1) grams.add(padded.slice(i, i + 3));
  return grams;
};

/**
 * Similarity in [0, 1].
 *
 * Token overlap dominates because it captures meaning; trigram overlap is a
 * smaller term that rescues near-identical phrasings the tokenizer split
 * differently. The 0.7/0.3 split was chosen so that a re-worded question with
 * the same concepts lands well above the review threshold while two genuinely
 * different questions on the same topic stay below it.
 */
export const similarity = (a, b) => {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  const tokenScore = dice(tokensA, tokensB);
  const gramScore = dice(trigrams(a), trigrams(b));
  let score = tokenScore * 0.7 + gramScore * 0.3;

  // Two questions taking opposite sides of one concept are not duplicates,
  // however much wording they share. Damped rather than zeroed: they are still
  // related enough that a reviewer may want to see them together.
  if (polarityConflict(a, b)) score *= 0.45;

  return Math.round(score * 1000) / 1000;
};

/** Bands used in reports, so the wording of a verdict is consistent. */
export const SIMILARITY_BANDS = Object.freeze({
  IDENTICAL: 1,
  VERY_HIGH: 0.8,
  HIGH: 0.65,
  MODERATE: 0.5,
});

export const bandFor = (score) => {
  if (score >= SIMILARITY_BANDS.IDENTICAL) return 'identical';
  if (score >= SIMILARITY_BANDS.VERY_HIGH) return 'very high';
  if (score >= SIMILARITY_BANDS.HIGH) return 'high';
  if (score >= SIMILARITY_BANDS.MODERATE) return 'moderate';
  return 'low';
};
