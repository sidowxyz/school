import {
  normalizeText,
  textFingerprint,
  tokenize,
  similarity,
  bandFor,
  SIMILARITY_BANDS,
} from '../src/ai/../utils/textSimilarity.js';

/**
 * Accuracy tests for exam repetition detection.
 *
 * These are the tests that matter for this feature: a detector that misses
 * re-worded repeats is useless, and one that flags genuinely different
 * questions is worse than useless because teachers stop trusting it.
 */

const REVIEW_THRESHOLD = SIMILARITY_BANDS.HIGH;

describe('normalization', () => {
  it('strips case and punctuation', () => {
    expect(normalizeText('Explain THREE causes, of soil-erosion!')).toBe(
      'explain three causes of soil erosion'
    );
  });

  it('normalizes curly quotes so copy-pasted text matches typed text', () => {
    expect(normalizeText('the plant’s roots')).toBe(normalizeText("the plant's roots"));
  });

  it('gives identical text the same fingerprint regardless of formatting', () => {
    expect(textFingerprint('Explain three causes of soil erosion.')).toBe(
      textFingerprint('  explain   THREE causes of soil erosion  ')
    );
  });

  it('gives different text different fingerprints', () => {
    expect(textFingerprint('Define osmosis.')).not.toBe(textFingerprint('Define diffusion.'));
  });

  it('drops stopwords and canonicalizes exam vocabulary', () => {
    // "describe" and "causes" collapse onto the same concepts as
    // "explain" and "factors" — that is what lets re-wordings match.
    expect(tokenize('Describe the causes of erosion')).toEqual(
      tokenize('Explain the factors of erosion')
    );
  });

  it('treats number words and digits alike', () => {
    expect(tokenize('name three types')).toEqual(tokenize('name 3 types'));
  });
});

describe('similarity — questions that ARE repeats', () => {
  it.each([
    // The example from the project brief.
    ['Explain three causes of soil erosion.', 'Describe three factors responsible for soil erosion.'],
    ['List four functions of the human liver.', 'State four roles of the liver in humans.'],
    ['Define photosynthesis.', 'What is the meaning of photosynthesis?'],
    ['Calculate the area of a circle of radius 7cm.', 'Find the area of a circle whose radius is 7cm.'],
    ['Outline the importance of crop rotation.', 'Discuss the significance of rotating crops.'],
    ['Name two types of soil erosion.', 'List 2 kinds of soil erosion.'],
  ])('flags "%s" against "%s"', (a, b) => {
    expect(similarity(a, b)).toBeGreaterThanOrEqual(REVIEW_THRESHOLD);
  });

  it('scores an identical question 1', () => {
    const q = 'Explain three causes of soil erosion.';
    expect(similarity(q, q)).toBe(1);
    expect(bandFor(similarity(q, q))).toBe('identical');
  });

  it('is symmetric', () => {
    const a = 'Explain three causes of soil erosion.';
    const b = 'Describe three factors responsible for soil erosion.';
    expect(similarity(a, b)).toBe(similarity(b, a));
  });
});

describe('similarity — questions that are NOT repeats', () => {
  it.each([
    ['Explain three causes of soil erosion.', 'Describe the process of photosynthesis in green plants.'],
    ['List four functions of the liver.', 'Calculate the area of a triangle.'],
    ['Define osmosis.', 'State Newton’s second law of motion.'],
  ])('does not flag "%s" against "%s"', (a, b) => {
    expect(similarity(a, b)).toBeLessThan(REVIEW_THRESHOLD);
  });

  /**
   * The hard case. These pairs share almost every word and nearly every
   * character trigram, so a naive lexical comparison rates them near-identical
   * — but they are opposite questions that both belong on a paper.
   */
  it.each([
    ['Discuss the advantages of nuclear energy.', 'Discuss the disadvantages of nuclear energy.'],
    ['State two similarities between mitosis and meiosis.', 'State two differences between mitosis and meiosis.'],
    ['Explain the strengths of a federal system.', 'Explain the weaknesses of a federal system.'],
    ['Explain the importance of vaccination.', 'Explain the limitations of vaccination.'],
  ])('does not treat opposites as duplicates: "%s" vs "%s"', (a, b) => {
    expect(similarity(a, b)).toBeLessThan(REVIEW_THRESHOLD);
  });
});

describe('similarity — edge cases', () => {
  it('returns 0 rather than throwing on empty input', () => {
    expect(similarity('', 'Define osmosis.')).toBe(0);
    expect(similarity('Define osmosis.', '')).toBe(0);
    expect(similarity(null, undefined)).toBe(0);
  });

  it('returns 0 when a question is nothing but stopwords', () => {
    expect(similarity('the of and', 'Define osmosis.')).toBe(0);
  });

  it('stays within 0 and 1', () => {
    const samples = [
      ['Explain three causes of soil erosion.', 'Describe three factors of soil erosion.'],
      ['a b c', 'x y z'],
      ['Define osmosis.', 'Define osmosis.'],
    ];
    for (const [a, b] of samples) {
      const score = similarity(a, b);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('bands scores consistently', () => {
    expect(bandFor(1)).toBe('identical');
    expect(bandFor(0.85)).toBe('very high');
    expect(bandFor(0.7)).toBe('high');
    expect(bandFor(0.55)).toBe('moderate');
    expect(bandFor(0.2)).toBe('low');
  });
});
