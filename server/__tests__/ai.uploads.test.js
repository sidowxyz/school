import { styleFingerprint, assessWritingIntegrity } from '../src/utils/writingStyleSignals.js';

/**
 * Pure-function tests for the two upload-review pipelines. No database, no
 * server, no file I/O — segmentation and stylometry are deterministic and
 * cheap to verify directly, the same way textSimilarity.js is tested.
 */

describe('writing-integrity signals', () => {
  const uniform =
    'Photosynthesis is a process that occurs in plants. Plants use sunlight to produce energy. ' +
    'Chlorophyll absorbs light in the leaves. Carbon dioxide combines with water to form glucose. ' +
    'Oxygen is released as a byproduct of the reaction. This process is essential for plant growth. ' +
    'Light intensity affects the rate of photosynthesis. Temperature also influences reaction speed.';

  const natural =
    'Plants make food through photosynthesis. This is a complex process that happens in the leaves! ' +
    'Chlorophyll absorbs sunlight, which then powers a chain of chemical reactions converting carbon ' +
    'dioxide and water into glucose and oxygen. The whole thing depends heavily on light intensity, ' +
    'temperature, and the amount of carbon dioxide available in the air around the plant.';

  it('never produces a percentage or score field of any kind', () => {
    // The one hard requirement from the approved design: signals, never a
    // number that could be read as "% AI-written."
    const result = assessWritingIntegrity(uniform);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/percent|score|probability|confidence/i);
  });

  it('flags unusually uniform sentence length as a named, explained signal', () => {
    const result = assessWritingIntegrity(uniform);
    expect(result.signals.map((s) => s.signal)).toContain('uniform-sentence-length');
    for (const signal of result.signals) {
      expect(typeof signal.detail).toBe('string');
      expect(signal.detail.length).toBeGreaterThan(10);
    }
  });

  it('does not flag naturally varied writing on sentence uniformity', () => {
    const result = assessWritingIntegrity(natural);
    expect(result.signals.map((s) => s.signal)).not.toContain('uniform-sentence-length');
  });

  it('requires at least two signals before recommending review', () => {
    // A single marker alone is too common in ordinary writing to flag on its
    // own — this is the threshold that keeps the review from over-firing.
    const result = assessWritingIntegrity(natural);
    if (result.signals.length < 2) {
      expect(result.reviewRecommended).toBe(false);
    }
  });

  it('flags a submission that shifts sharply from the student\'s own history', () => {
    // Deliberately short, choppy sentences (avg ~3 words) against the uniform
    // sample's avg of 7 — a clear, unambiguous shift rather than a borderline
    // one, since this test exists to prove the comparison mechanism fires at
    // all, not to probe the exact threshold.
    const priorStyle = styleFingerprint(
      'I like dogs. They are fun. I like cats too. Cats are nice. I like pets. Pets are great.'
    );
    const result = assessWritingIntegrity(uniform, [priorStyle]);
    expect(result.signals.map((s) => s.signal)).toContain('sentence-length-shift');
    expect(result.comparedAgainstSubmissions).toBe(1);
  });

  it('does not compare against history when none exists', () => {
    const result = assessWritingIntegrity(uniform, []);
    expect(result.comparedAgainstSubmissions).toBe(0);
  });

  it('declines to assess text too short to say anything meaningful', () => {
    const result = assessWritingIntegrity('Too short.');
    expect(result.signals).toHaveLength(0);
    expect(result.reviewRecommended).toBe(false);
  });

  it('always includes a disclaiming note, not a bare verdict', () => {
    const flagged = assessWritingIntegrity(uniform);
    const clean = assessWritingIntegrity(natural);
    expect(flagged.note.length).toBeGreaterThan(0);
    expect(clean.note.length).toBeGreaterThan(0);
  });
});

describe('style fingerprint', () => {
  it('produces stable, comparable numeric fields', () => {
    const fp = styleFingerprint('This is a simple test sentence. It has two parts to it.');
    expect(fp.wordCount).toBeGreaterThan(0);
    expect(fp.sentenceCount).toBe(2);
    expect(fp.avgSentenceLength).toBeGreaterThan(0);
  });

  it('handles empty input without throwing', () => {
    expect(() => styleFingerprint('')).not.toThrow();
    expect(styleFingerprint('').wordCount).toBe(0);
  });

  it('only computes vocabulary richness above the minimum length', () => {
    expect(styleFingerprint('short text here').vocabularyRichness).toBeNull();
  });
});
