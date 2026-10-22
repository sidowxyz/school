import mongoose from 'mongoose';
import ExamQuestion from '../models/ExamQuestion.js';
import AppError from '../utils/AppError.js';
import {
  normalizeText,
  textFingerprint,
  similarity,
  bandFor,
  SIMILARITY_BANDS,
} from '../utils/textSimilarity.js';

/**
 * Exam repetition detection and paper quality review.
 *
 * Both run entirely on deterministic logic — no model, no API key, no billable
 * call. Structural problems (marks that do not add up, repeated numbering) are
 * arithmetic, and repetition is lexical. Reserving the model for the things it
 * is actually better at keeps this instant and free.
 */

/** Never score a new question against the whole archive. */
const CANDIDATE_LIMIT = 400;
const DEFAULT_TOP_K = 5;

/**
 * Pull a bounded candidate set, narrowed by subject and class where known.
 *
 * This is the step that keeps the pipeline viable as the bank grows: retrieval
 * is an indexed query, and only the shortlist is scored in memory.
 */
const fetchCandidates = async ({ subjectId, classId, excludeId }) => {
  const filter = {};
  if (subjectId && mongoose.isValidObjectId(subjectId)) filter.subjectId = subjectId;
  if (classId && mongoose.isValidObjectId(classId)) filter.classId = classId;
  if (excludeId && mongoose.isValidObjectId(excludeId)) filter._id = { $ne: excludeId };

  return ExamQuestion.find(filter)
    .sort({ createdAt: -1 })
    .limit(CANDIDATE_LIMIT)
    .select('text normalizedText fingerprint subjectName className academicYear term examType topic marks createdAt');
};

const toMatch = (candidate, score) => ({
  questionId: candidate._id.toString(),
  text: candidate.text,
  subject: candidate.subjectName || '',
  class: candidate.className || '',
  academicYear: candidate.academicYear || '',
  term: candidate.term || '',
  examType: candidate.examType || '',
  topic: candidate.topic || '',
  similarity: score,
  band: bandFor(score),
});

/**
 * Compare one question against the archive.
 *
 * Exact duplicates are resolved by indexed fingerprint lookup first, so the
 * common case costs one query and no scoring at all.
 */
export const checkQuestionSimilarityService = async ({
  text,
  subjectId,
  classId,
  excludeId,
  topK = DEFAULT_TOP_K,
}) => {
  const trimmed = String(text ?? '').trim();
  if (trimmed.length < 5) {
    throw new AppError('Provide the question text to check.', 400);
  }

  const fingerprint = textFingerprint(trimmed);

  const exactFilter = { fingerprint };
  if (excludeId && mongoose.isValidObjectId(excludeId)) exactFilter._id = { $ne: excludeId };

  const exact = await ExamQuestion.find(exactFilter)
    .limit(topK)
    .select('text subjectName className academicYear term examType topic');

  if (exact.length > 0) {
    return {
      verdict: 'exact-duplicate',
      reviewRecommended: true,
      summary: `This question already exists verbatim in the bank (${exact.length} match${exact.length === 1 ? '' : 'es'}).`,
      highestSimilarity: 1,
      matches: exact.map((c) => toMatch(c, 1)),
      candidatesCompared: exact.length,
    };
  }

  const candidates = await fetchCandidates({ subjectId, classId, excludeId });

  const scored = candidates
    .map((c) => ({ candidate: c, score: similarity(trimmed, c.text) }))
    .filter((row) => row.score >= SIMILARITY_BANDS.MODERATE)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const highest = scored[0]?.score ?? 0;

  let verdict = 'original';
  if (highest >= SIMILARITY_BANDS.VERY_HIGH) verdict = 'near-duplicate';
  else if (highest >= SIMILARITY_BANDS.HIGH) verdict = 'similar';
  else if (highest >= SIMILARITY_BANDS.MODERATE) verdict = 'loosely-related';

  const summaries = {
    'near-duplicate':
      'A previous question asks essentially the same thing in different words. Review before including it.',
    similar: 'A previous question covers similar ground. Worth a look.',
    'loosely-related': 'Some overlap with earlier questions, but they appear distinct.',
    original: 'No comparable question found in the bank for this subject and class.',
  };

  return {
    verdict,
    reviewRecommended: highest >= SIMILARITY_BANDS.HIGH,
    summary: summaries[verdict],
    highestSimilarity: highest,
    matches: scored.map((row) => toMatch(row.candidate, row.score)),
    candidatesCompared: candidates.length,
  };
};

/** Bank questions, skipping ones already stored verbatim. */
export const addExamQuestionsService = async ({ questions, meta = {} }, userId) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new AppError('Provide at least one question.', 400);
  }

  const added = [];
  const skipped = [];

  for (const item of questions) {
    const text = String(item?.text ?? '').trim();
    if (text.length < 5) {
      skipped.push({ text, reason: 'Too short to bank' });
      continue;
    }

    const fingerprint = textFingerprint(text);
    const existing = await ExamQuestion.findOne({ fingerprint }).select('_id');
    if (existing) {
      skipped.push({ text, reason: 'Already in the bank', questionId: existing._id.toString() });
      continue;
    }

    const created = await ExamQuestion.create({
      text,
      normalizedText: normalizeText(text),
      fingerprint,
      subjectId: mongoose.isValidObjectId(meta.subjectId) ? meta.subjectId : null,
      classId: mongoose.isValidObjectId(meta.classId) ? meta.classId : null,
      examId: mongoose.isValidObjectId(meta.examId) ? meta.examId : null,
      subjectName: meta.subjectName ?? '',
      className: meta.className ?? '',
      academicYear: meta.academicYear ?? '',
      term: meta.term ?? '',
      examType: meta.examType ?? '',
      topic: item.topic ?? '',
      marks: Number(item.marks) || 0,
      difficulty: item.difficulty ?? 'unspecified',
      questionType: item.questionType ?? 'unspecified',
      createBy: userId ?? null,
    });

    added.push({ questionId: created._id.toString(), text: created.text });
  }

  return { addedCount: added.length, skippedCount: skipped.length, added, skipped };
};

/**
 * Structural and originality review of a whole paper.
 *
 * Everything here is arithmetic or lexical. A model is not involved and is not
 * needed: whether marks total correctly is not a judgement call.
 */
export const reviewExamQualityService = async ({ questions, expectedTotalMarks, subjectId, classId }) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new AppError('Provide the questions to review.', 400);
  }

  const issues = [];
  const cleaned = questions.map((q, index) => ({
    index: index + 1,
    text: String(q?.text ?? '').trim(),
    marks: Number(q?.marks) || 0,
    topic: q?.topic ?? '',
    difficulty: q?.difficulty ?? 'unspecified',
  }));

  /* ---- structure ---- */
  const totalMarks = cleaned.reduce((sum, q) => sum + q.marks, 0);

  if (expectedTotalMarks && totalMarks !== Number(expectedTotalMarks)) {
    issues.push({
      severity: 'high',
      type: 'marks-mismatch',
      message: `Marks total ${totalMarks}, but the paper is meant to be out of ${expectedTotalMarks}.`,
    });
  }

  const unmarked = cleaned.filter((q) => q.marks <= 0);
  if (unmarked.length > 0) {
    issues.push({
      severity: 'high',
      type: 'missing-marks',
      message: `${unmarked.length} question(s) carry no marks: ${unmarked.map((q) => `Q${q.index}`).join(', ')}.`,
    });
  }

  const empty = cleaned.filter((q) => q.text.length < 5);
  if (empty.length > 0) {
    issues.push({
      severity: 'high',
      type: 'empty-question',
      message: `${empty.length} question(s) have no usable text: ${empty.map((q) => `Q${q.index}`).join(', ')}.`,
    });
  }

  /* ---- duplicates within the paper itself ---- */
  const seen = new Map();
  const internalDuplicates = [];
  for (const q of cleaned) {
    if (!q.text) continue;
    const fp = textFingerprint(q.text);
    if (seen.has(fp)) {
      internalDuplicates.push({ first: seen.get(fp), second: q.index, similarity: 1 });
    } else {
      seen.set(fp, q.index);
    }
  }

  for (let i = 0; i < cleaned.length; i += 1) {
    for (let j = i + 1; j < cleaned.length; j += 1) {
      if (!cleaned[i].text || !cleaned[j].text) continue;
      const score = similarity(cleaned[i].text, cleaned[j].text);
      if (score >= SIMILARITY_BANDS.HIGH && score < 1) {
        internalDuplicates.push({ first: cleaned[i].index, second: cleaned[j].index, similarity: score });
      }
    }
  }

  if (internalDuplicates.length > 0) {
    issues.push({
      severity: 'high',
      type: 'internal-repetition',
      message: internalDuplicates
        .map((d) => `Q${d.first} and Q${d.second} overlap (${Math.round(d.similarity * 100)}%)`)
        .join('; '),
    });
  }

  /* ---- originality against the archive ---- */
  const repeats = [];
  for (const q of cleaned) {
    if (!q.text) continue;
    const result = await checkQuestionSimilarityService({
      text: q.text,
      subjectId,
      classId,
      topK: 2,
    });
    if (result.reviewRecommended) {
      repeats.push({
        question: q.index,
        verdict: result.verdict,
        highestSimilarity: result.highestSimilarity,
        matches: result.matches.slice(0, 2),
      });
    }
  }

  if (repeats.length > 0) {
    issues.push({
      severity: 'medium',
      type: 'archive-repetition',
      message: `${repeats.length} question(s) closely match earlier papers: ${repeats.map((r) => `Q${r.question}`).join(', ')}.`,
    });
  }

  /* ---- balance ---- */
  const difficultyMix = cleaned.reduce((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  const topics = cleaned.map((q) => q.topic).filter(Boolean);
  const topicCoverage = [...new Set(topics)];

  if (topics.length === 0) {
    issues.push({
      severity: 'low',
      type: 'no-topics',
      message: 'No topics are tagged, so curriculum coverage cannot be assessed.',
    });
  } else if (topicCoverage.length === 1 && cleaned.length > 3) {
    issues.push({
      severity: 'medium',
      type: 'narrow-coverage',
      message: `Every question covers one topic ("${topicCoverage[0]}").`,
    });
  }

  const highSeverity = issues.filter((i) => i.severity === 'high').length;

  return {
    questionCount: cleaned.length,
    totalMarks,
    expectedTotalMarks: expectedTotalMarks ? Number(expectedTotalMarks) : null,
    structureValid: highSeverity === 0,
    issueCount: issues.length,
    issues,
    internalDuplicates,
    archiveRepetition: repeats,
    difficultyMix,
    topicCoverage,
    // The paper is the teacher's to approve. This report informs that decision;
    // it does not make it.
    reviewRecommended: issues.length > 0,
  };
};
