/**
 * Splits a raw exam paper's text into individual questions.
 *
 * Deterministic on purpose, and tried first: a numbered exam paper ("1.",
 * "Q2)", "Question 3:") is a formatting convention, not something that needs
 * inference. Getting this right without a model keeps segmentation free and
 * instant for the common case, and — like the rest of this codebase — means
 * uploading a paper for review works even with no API key configured.
 *
 * Only falls back to asking a model when the deterministic pass genuinely
 * cannot find question boundaries (see needsModelFallback below); the caller
 * decides whether a key is available to do that.
 */

// Matches a line that starts a new question: "1.", "1)", "Q1.", "Question 1:",
// optionally followed by a trailing mark allocation like "(10 marks)" or "[10]"
// anywhere on the line.
// The separator must be followed by either real content or nothing at all
// (end of line) — requiring `\s+` unconditionally meant a heading line with
// nothing after it (a page-break artifact, or a heading on its own line
// before its question text) was invisible to this regex entirely. Because the
// sequential check below anchors off the last number it *did* recognise, one
// invisible line didn't just get skipped — it desynced every question after
// it, since the next real number would no longer look consecutive.
// `.)` is listed first because alternation is ordered: with `[.):]` tried
// first, "1.)" matched the "." and then demanded whitespace, hit ")" and
// failed — so a paper numbered "1.) 2.) 3.)" produced zero questions and was
// reported to the teacher as unnumbered. Multiple-choice option labels
// ("a.)", "b.)") are unaffected: this anchors on \d, so letters never match.
const QUESTION_START = /^\s*(?:q(?:uestion)?\.?\s*)?(\d{1,3})(?:\.\)|[.):])(?:\s+|$)/i;
const MARKS_HINT = /[([]\s*(\d{1,3})\s*(?:marks?)?\s*[)\]]|\b(\d{1,3})\s*marks?\b/i;

/** How far a question number may jump forward and still open a new question. */
const MAX_NUMBER_GAP = 10;

const extractMarks = (text) => {
  const match = text.match(MARKS_HINT);
  if (!match) return 0;
  return Number(match[1] ?? match[2]) || 0;
};

/**
 * Strips a detected mark allocation out of the question body so it doesn't
 * linger in the text shown back to the teacher (e.g. "Explain X. (10 marks)"
 * becomes "Explain X.").
 */
const stripMarksHint = (text) => text.replace(MARKS_HINT, '').replace(/\s+$/, '').trim();

export const segmentExamText = (rawText) => {
  const lines = String(rawText ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n');

  const questions = [];
  let current = null;
  let lastNumber = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(QUESTION_START);
    const number = match ? Number(match[1]) : null;

    // A new question line must number forward — this is what stops "10 marks"
    // or a stray "3." inside body text from being mistaken for a new question
    // boundary. A small forward jump is allowed rather than strictly +1: real
    // papers skip numbers when a question is deleted during editing (this
    // Biology paper runs 91 -> 94), and requiring +1 meant the first such gap
    // silently swallowed every remaining question into the previous one's
    // body — 91 questions found instead of 208, with no error raised. The
    // window stays narrow so a stray large number at the start of a line (a
    // year, a quantity) still cannot open a bogus question.
    // The window governs the step *between* questions, so the first one may
    // carry any number — a paper that starts at 91 (one section of a larger
    // bank) is still a numbered paper, and measuring its first question
    // against 0 would reject the whole document.
    const looksSequential =
      number !== null &&
      number > lastNumber &&
      (lastNumber === 0 || number - lastNumber <= MAX_NUMBER_GAP);

    if (looksSequential) {
      if (current) questions.push(current);
      current = { text: trimmed.slice(match[0].length).trim(), marksHint: 0 };
      lastNumber = number;
    } else if (current) {
      current.text += ` ${trimmed}`;
    }
  }
  if (current) questions.push(current);

  const finalized = questions
    .map((q) => ({
      text: stripMarksHint(q.text),
      marks: extractMarks(q.text),
    }))
    .filter((q) => q.text.length >= 5);

  return {
    questions: finalized,
    method: 'deterministic',
    // A single run-on block, or nothing recognisable, means the paper isn't
    // numbered in a way this pass understands — not that it has one question.
    needsModelFallback: finalized.length <= 1,
  };
};
