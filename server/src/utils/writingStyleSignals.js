/**
 * Deterministic stylometric signals for the writing-integrity review.
 *
 * Deliberately does not attempt an "AI-generated" score. Detectors that claim
 * one have a real false-positive problem, and it isn't evenly spread — it
 * disproportionately flags non-native English writers and careful,
 * rule-following academic writing, which describes a lot of conscientious
 * students. A percentage next to a real student's name reads as evidence; it
 * would not be. This produces named, individually-inspectable indicators
 * instead — sentence-length uniformity and a comparison against the same
 * student's own earlier work — so a teacher can look at *why* something was
 * flagged and judge it themselves. The result is always framed as "review
 * recommended," never a verdict.
 */

const splitSentences = (text) =>
  String(text ?? '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const splitWords = (text) =>
  String(text ?? '')
    .toLowerCase()
    .match(/[a-z']+/g) ?? [];

const mean = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

const stdDev = (nums) => {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(mean(nums.map((n) => (n - m) ** 2)));
};

/**
 * A compact fingerprint of one piece of writing — cheap to compute and cheap
 * to compare, so it works the same whether comparing one submission or
 * scanning a student's whole history.
 */
export const styleFingerprint = (text) => {
  const sentences = splitSentences(text);
  const words = splitWords(text);
  const sentenceLengths = sentences.map((s) => splitWords(s).length).filter((n) => n > 0);
  const uniqueWords = new Set(words);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgSentenceLength: mean(sentenceLengths),
    sentenceLengthStdDev: stdDev(sentenceLengths),
    // Type-token ratio: vocabulary breadth relative to length. Only
    // meaningful above a minimum length, where it stops being dominated by
    // how short the sample is.
    vocabularyRichness: words.length >= 30 ? uniqueWords.size / words.length : null,
    avgWordLength: mean(words.map((w) => w.length)),
  };
};

/**
 * Signals from a single submission's own shape.
 *
 * Low sentence-length variability — every sentence close to the same length —
 * is a real, well-established stylometric marker of formulaic writing. It is
 * still just a marker: named and explained, not scored.
 */
const structuralSignals = (fp) => {
  const signals = [];

  if (fp.sentenceCount >= 5 && fp.avgSentenceLength > 0) {
    const uniformity = fp.sentenceLengthStdDev / fp.avgSentenceLength;
    if (uniformity < 0.25) {
      signals.push({
        signal: 'uniform-sentence-length',
        detail: `Sentences are unusually consistent in length (average ${fp.avgSentenceLength.toFixed(1)} words, low variation). Human writing under exam or homework conditions is typically more irregular.`,
      });
    }
  }

  if (fp.wordCount >= 30 && fp.vocabularyRichness !== null && fp.vocabularyRichness > 0.75) {
    signals.push({
      signal: 'high-vocabulary-breadth',
      detail: 'A notably wide vocabulary relative to length, with little word repetition.',
    });
  }

  return signals;
};

/**
 * Signals from comparing against the same student's earlier submissions.
 *
 * This is the more informative half: a shift from a student's own established
 * pattern is a stronger, fairer signal than any absolute measure, because it's
 * relative to that individual rather than to a population norm that may not
 * fit them (e.g. a non-native speaker's baseline is naturally different from
 * a population average, but should not differ much from their own baseline).
 */
const comparisonSignals = (current, priorFingerprints) => {
  if (priorFingerprints.length === 0) return [];

  const priorAvg = {
    avgSentenceLength: mean(priorFingerprints.map((f) => f.avgSentenceLength)),
    avgWordLength: mean(priorFingerprints.map((f) => f.avgWordLength)),
    vocabularyRichness: mean(
      priorFingerprints.map((f) => f.vocabularyRichness).filter((v) => v !== null)
    ),
  };

  const signals = [];

  if (priorAvg.avgSentenceLength > 0) {
    const shift =
      Math.abs(current.avgSentenceLength - priorAvg.avgSentenceLength) / priorAvg.avgSentenceLength;
    if (shift > 0.5) {
      signals.push({
        signal: 'sentence-length-shift',
        detail: `Average sentence length (${current.avgSentenceLength.toFixed(1)} words) differs substantially from this student's earlier work (typically ${priorAvg.avgSentenceLength.toFixed(1)} words).`,
      });
    }
  }

  if (priorAvg.avgWordLength > 0) {
    const shift = Math.abs(current.avgWordLength - priorAvg.avgWordLength) / priorAvg.avgWordLength;
    if (shift > 0.3) {
      signals.push({
        signal: 'vocabulary-shift',
        detail: 'Word choice and complexity differ noticeably from this student’s earlier submissions.',
      });
    }
  }

  if (
    current.vocabularyRichness !== null &&
    priorAvg.vocabularyRichness &&
    current.vocabularyRichness - priorAvg.vocabularyRichness > 0.15
  ) {
    signals.push({
      signal: 'vocabulary-richness-shift',
      detail: 'This submission uses a noticeably broader vocabulary than this student’s earlier work.',
    });
  }

  return signals;
};

/**
 * Full writing-integrity assessment for one submission.
 *
 * `priorFingerprints` should be pre-computed fingerprints of the same
 * student's earlier submissions — computed once at storage time rather than
 * re-derived from stored raw text on every comparison.
 */
export const assessWritingIntegrity = (text, priorFingerprints = []) => {
  const fingerprint = styleFingerprint(text);

  if (fingerprint.wordCount < 40) {
    return {
      fingerprint,
      signals: [],
      reviewRecommended: false,
      note: 'Too short for a meaningful style comparison.',
    };
  }

  const signals = [...structuralSignals(fingerprint), ...comparisonSignals(fingerprint, priorFingerprints)];

  return {
    fingerprint,
    signals,
    // Two or more independent signals is the bar for surfacing this to a
    // teacher at all — a single marker alone is too common in ordinary
    // writing to be worth a flag.
    reviewRecommended: signals.length >= 2,
    comparedAgainstSubmissions: priorFingerprints.length,
    note:
      signals.length >= 2
        ? 'These are indicators for your judgement, not proof of anything. Style varies naturally — use this alongside what you know about the student.'
        : 'No notable indicators found.',
  };
};
