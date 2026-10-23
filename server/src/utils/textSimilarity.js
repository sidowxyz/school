/**
 * Word tokenizer for matching free-text questions to the AI assistant's tools.
 *
 * normalize -> drop stopwords -> canonicalize common synonyms -> light stemming,
 * so "teachers" and "teacher", or "list" and "state", count as the same word.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with', 'from',
  'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'that', 'this', 'these', 'those', 'it', 'its', 'as', 'you', 'your',
  'do', 'does', 'did', 'can', 'could', 'should', 'would', 'may', 'might',
  'following', 'below', 'above', 'given', 'question', 'answer', 'marks', 'mark',
]);

/**
 * Command verbs and nouns that mean the same thing, so "explain three causes"
 * and "describe three factors" tokenize alike.
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
 * that actually show up in everyday school wording.
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
