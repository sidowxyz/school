import { segmentExamText } from '../src/utils/questionSegmentation.js';
import { styleFingerprint, assessWritingIntegrity } from '../src/utils/writingStyleSignals.js';

/**
 * Pure-function tests for the two upload-review pipelines. No database, no
 * server, no file I/O — segmentation and stylometry are deterministic and
 * cheap to verify directly, the same way textSimilarity.js is tested.
 */

describe('question segmentation', () => {
  it('splits a cleanly numbered paper', () => {
    const paper = [
      '1. Explain three causes of soil erosion. (6 marks)',
      '2) Describe the water cycle. [8 marks]',
      'Q3. Calculate the area of a circle of radius 7cm. 10 marks',
      'Question 4: State two differences between mitosis and meiosis.',
    ].join('\n');

    const result = segmentExamText(paper);

    expect(result.method).toBe('deterministic');
    expect(result.needsModelFallback).toBe(false);
    expect(result.questions).toHaveLength(4);
    expect(result.questions[0]).toMatchObject({ marks: 6 });
    expect(result.questions[0].text).toContain('soil erosion');
    expect(result.questions[3].text).toContain('mitosis');
  });

  it('treats "1.)" as a question boundary', () => {
    // A real uploaded Biology paper numbered every question this way. The
    // separator class matched the "." then demanded whitespace, hit the ")"
    // and failed, so the whole paper segmented to zero questions and came
    // back to the teacher as "could not identify individual questions".
    const paper = [
      '1.) A light microscope is restricted by',
      'a.) the size of the oculars.',
      'b.) its limit of resolution.',
      '2.) The lens at the top of the tube is called the',
      'a.) diaphragm.',
      'b.) ocular.',
    ].join('\n');

    const result = segmentExamText(paper);

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].text).toContain('light microscope');
    expect(result.questions[1].text).toContain('lens at the top');
  });

  it('keeps segmenting across a gap in the numbering', () => {
    // Papers skip numbers when a question is deleted during editing — the
    // Biology paper runs 91 -> 94. Requiring a strict +1 meant the first gap
    // swallowed every later question into the previous one's body, silently
    // and with no error: 91 questions found in a 204-question paper.
    const paper = [
      '91.) Members of phylum Pyrrophyta are known as',
      '94.) The phylum Acrasiomycetes includes the',
      '95.) Another question follows here.',
    ].join('\n');

    const result = segmentExamText(paper);

    expect(result.questions).toHaveLength(3);
    expect(result.questions[2].text).toContain('Another question');
  });

  it('still ignores a number that jumps too far to be the next question', () => {
    const paper = [
      '1. A real question about soil formation.',
      '2024. was a year mentioned mid-paper.',
      '2. The next real question about erosion.',
    ].join('\n');

    const result = segmentExamText(paper);

    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].text).toContain('2024');
  });

  it('recognises "." ")" and ":" as equivalent numbering separators', () => {
    const paper = '1. First question here about topic one.\n2) Second one about topic two.\n3: Third one about topic three.';
    expect(segmentExamText(paper).questions).toHaveLength(3);
  });

  it('folds a wrapped question body onto its heading line', () => {
    const paper =
      '1. Explain three causes of soil erosion.\nDiscuss with reference to highland farming areas.\n\n2. Describe the water cycle.';
    const result = segmentExamText(paper);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].text).toContain('highland farming');
  });

  it('does not mistake a mark allocation or stray digit for a new question', () => {
    // "10 marks" and a bare "3." inside body text must not be read as
    // question boundaries — only a number that continues the sequence counts.
    const paper =
      '1. Calculate the total of 3 numbers and their average. (10 marks)\n\n2. Explain why this matters.';
    const result = segmentExamText(paper);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].marks).toBe(10);
  });

  it('reports needsModelFallback on unnumbered running text', () => {
    const result = segmentExamText(
      'Explain photosynthesis in plants and describe its stages in detail without any numbering.'
    );
    expect(result.questions).toHaveLength(0);
    expect(result.needsModelFallback).toBe(true);
  });

  it('strips the marks hint out of the visible question text', () => {
    const result = segmentExamText('1. Explain osmosis. (5 marks)');
    expect(result.questions[0].text).toBe('Explain osmosis.');
    expect(result.questions[0].text).not.toMatch(/marks/i);
  });

  it('discards a numbered heading with no real content', () => {
    const result = segmentExamText('1.\n2. A real question with actual content here.');
    expect(result.questions).toHaveLength(1);
  });
});

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
