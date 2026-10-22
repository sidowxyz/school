import { z } from 'zod';

import aiConfig from '../config/aiConfig.js';
import AppError from '../utils/AppError.js';
import { extractTextFromDocument } from '../utils/textExtraction.js';
import { segmentExamText } from '../utils/questionSegmentation.js';
import { getProvider } from '../ai/providers/index.js';
import { examGrammarReviewPrompt, PROMPT_VERSION } from '../ai/prompts.js';
import { fingerprint, readCache, writeCache, recordUsage } from '../ai/cache.js';
import { reviewExamQualityService } from './examIntelligenceService.js';

/**
 * Reviews an uploaded, already-written exam paper: structure, originality
 * against the question bank, grammar, and whether it should be redone.
 *
 * This is the upload-driven sibling of reviewExamQualityService, which takes
 * typed JSON questions. Getting from a document to that same question list is
 * the only new work here — everything downstream (mark totals, internal
 * repetition, archive similarity) is the exact same deterministic pipeline,
 * run unchanged.
 */

const REDO_THRESHOLD_PERCENT = 40;

const grammarIssueSchema = z.object({
  issues: z
    .array(
      z.object({
        questionNumber: z.number().int().min(1),
        quote: z.string().trim().min(1).max(300),
        suggestion: z.string().trim().min(1).max(500),
      })
    )
    .max(60),
});

const grammarResponseSchema = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          questionNumber: { type: 'number' },
          quote: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['questionNumber', 'quote', 'suggestion'],
      },
    },
  },
  required: ['issues'],
};

/**
 * One call over the whole numbered paper rather than per-question — a single
 * request is far cheaper than N, and the model has the full paper as context
 * either way.
 */
const checkGrammar = async (questions, actor) => {
  if (!aiConfig.isLlmEnabled) return { issues: [], available: false };

  const numbered = questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n\n');
  const key = fingerprint({ tool: 'examGrammarReview', args: null, payload: numbered });

  const cached = await readCache(key);
  if (cached) return { issues: cached, available: true };

  try {
    const { text, usage } = await getProvider().complete({
      system: examGrammarReviewPrompt(),
      messages: [{ role: 'user', content: numbered }],
      jsonSchema: grammarResponseSchema,
      tier: 'economy',
    });

    const parsed = grammarIssueSchema.parse(JSON.parse(text));
    if (actor) await recordUsage({ tool: 'examGrammarReview', tier: 'economy', usage, actor });
    await writeCache(key, 'examGrammarReview', parsed.issues);
    return { issues: parsed.issues, available: true };
  } catch {
    // Grammar checking is an enhancement over a review that is already useful
    // without it (structure and originality need no model at all) — a
    // provider hiccup here degrades to "not available," not a failed request.
    return { issues: [], available: false, note: 'Grammar check could not be completed this time.' };
  }
};

export const reviewExamUploadService = async ({
  buffer,
  fileName,
  subjectId,
  classId,
  subjectName,
  className,
  expectedTotalMarks,
  actor,
}) => {
  const text = await extractTextFromDocument(buffer, fileName);
  const segmentation = segmentExamText(text);

  if (segmentation.questions.length === 0) {
    throw new AppError(
      'Could not identify individual questions in this document. Number each question ' +
        '(e.g. "1.", "Q2:") so they can be told apart, then upload again.',
      400
    );
  }

  const quality = await reviewExamQualityService({
    questions: segmentation.questions,
    expectedTotalMarks,
    subjectId,
    classId,
  });

  const grammar = await checkGrammar(segmentation.questions, actor);

  const repeatedPercent =
    segmentation.questions.length > 0
      ? Math.round((quality.archiveRepetition.length / segmentation.questions.length) * 1000) / 10
      : 0;

  const redoRecommended = repeatedPercent >= REDO_THRESHOLD_PERCENT;

  return {
    fileName,
    subject: subjectName ?? '',
    class: className ?? '',
    extractionMethod: segmentation.method,
    questionsDetected: segmentation.questions.length,
    questions: segmentation.questions,
    quality,
    grammar,
    repeatedFromArchivePercent: repeatedPercent,
    redoThresholdPercent: REDO_THRESHOLD_PERCENT,
    redoRecommended,
    redoReason: redoRecommended
      ? `${repeatedPercent}% of questions closely match earlier papers, at or above the ${REDO_THRESHOLD_PERCENT}% threshold for recommending a rewrite.`
      : null,
    promptVersion: PROMPT_VERSION,
  };
};
