import { z } from 'zod';

import aiConfig from '../config/aiConfig.js';
import AppError from '../utils/AppError.js';
import { getProvider } from '../ai/providers/index.js';
import { fingerprint, readCache, writeCache, recordUsage } from '../ai/cache.js';
import { reviewExamQualityService } from './examIntelligenceService.js';
import TeachingLog from '../models/TeachingLog.js';

/**
 * Draft exam generation.
 *
 * This is the one genuinely model-shaped task in the assistant: composing new
 * questions cannot be done deterministically. Everything *around* it still is —
 * topic context comes from teaching logs, the model's output is schema-checked,
 * and the finished paper is run through the same deterministic quality review
 * as a hand-written one before the teacher ever sees it.
 *
 * The result is always a DRAFT. Nothing is written to the Exam collection and
 * no paper is scheduled; the teacher reviews, edits and creates the real exam
 * through the existing examination module. The assistant does not get to decide
 * what students sit.
 */

/** Shape the model must return. Re-validated here — never trusted as given. */
const generatedExamSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().trim().min(5).max(2000),
        marks: z.number().min(0).max(100),
        topic: z.string().trim().max(120).default(''),
        difficulty: z.enum(['easy', 'moderate', 'hard']).default('moderate'),
        questionType: z
          .enum(['short-answer', 'essay', 'multiple-choice', 'calculation'])
          .default('short-answer'),
      })
    )
    .min(1)
    .max(60),
});

/** Provider-side schema, so the model returns JSON rather than prose. */
const responseSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          marks: { type: 'number' },
          topic: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'moderate', 'hard'] },
          questionType: {
            type: 'string',
            enum: ['short-answer', 'essay', 'multiple-choice', 'calculation'],
          },
        },
        required: ['text', 'marks', 'topic', 'difficulty'],
      },
    },
  },
  required: ['questions'],
};

/**
 * Topics actually taught, drawn from completed teaching logs.
 *
 * This is what stops generation being generic: a paper should examine what was
 * covered, not what a syllabus says in the abstract. Falls back silently to the
 * caller's topics when no logs exist.
 */
const taughtTopics = async ({ subject, classId, limit = 40 }) => {
  const filter = { status: 'completed' };
  if (subject) filter.subject = new RegExp(`^${String(subject).trim()}$`, 'i');
  if (classId) filter.classId = String(classId);

  const logs = await TeachingLog.find(filter)
    .sort({ date: -1 })
    .limit(limit)
    .select('topicTaught');

  return [...new Set(logs.map((l) => l.topicTaught).filter(Boolean))];
};

const buildPrompt = ({ grade, subject, topics, questionCount, totalMarks, difficulty }) =>
  [
    'You write examination papers for a school.',
    '',
    `Subject: ${subject}`,
    `Class/grade: ${grade}`,
    topics.length > 0 ? `Topics to cover: ${topics.join('; ')}` : 'Topics: use standard curriculum topics for this subject and grade.',
    `Write exactly ${questionCount} questions.`,
    `The marks must total exactly ${totalMarks}.`,
    `Overall difficulty: ${difficulty}.`,
    '',
    'Rules:',
    '- Each question must examine a different idea. Do not ask the same thing twice in different words.',
    '- Spread the questions across the listed topics rather than clustering on one.',
    '- Use a mix of difficulties, weighted toward the requested overall level.',
    '- Write questions a student sits, not instructions to a teacher.',
    '- Set each question\'s marks in proportion to the work it requires.',
    '- Tag every question with the topic it examines.',
    '- Return JSON only.',
  ].join('\n');

export const generateExamService = async ({
  grade,
  subject,
  topics = [],
  questionCount = 10,
  totalMarks = 100,
  difficulty = 'moderate',
  classId,
  subjectId,
  actor,
}) => {
  if (!aiConfig.isLlmEnabled) {
    // Explicit rather than a generic failure: this is the one feature that
    // genuinely cannot degrade, and the user should know why.
    throw new AppError(
      'Exam generation needs an AI provider key, which is not configured on this server. Every other assistant feature works without one.',
      503
    );
  }

  const curriculumTopics = topics.length > 0 ? topics : await taughtTopics({ subject, classId });

  const promptInput = { grade, subject, topics: curriculumTopics, questionCount, totalMarks, difficulty };

  // Generation is the most expensive call in the system, and the same request
  // often gets retried while a teacher tweaks wording elsewhere. Cache on the
  // full input so an identical request costs nothing the second time.
  const key = fingerprint({ tool: 'generateExam', args: promptInput, payload: null });
  const cached = await readCache(key);

  let questions;
  if (cached) {
    questions = cached;
    if (actor) await recordUsage({ actor, tool: 'generateExam', tier: 'advanced', usage: null, cachedHit: true });
  } else {
    const call = (tier) =>
      getProvider().complete({
        system: buildPrompt(promptInput),
        messages: [{ role: 'user', content: `Generate the ${subject} paper for ${grade}.` }],
        jsonSchema: responseSchema,
        tier,
      });

    // Retrying on the economy tier only helps when it points at a genuinely
    // different model — plenty of setups (including free-tier keys, where
    // Pro's quota is often near zero) configure both tiers to the same model,
    // and retrying an exhausted quota against itself just spends a second
    // call to fail the same way. Skip straight to surfacing the real error.
    let text;
    let usage;
    try {
      ({ text, usage } = await call('advanced'));
    } catch (err) {
      if (!err?.providerQuota || aiConfig.models.economy === aiConfig.models.advanced) throw err;
      console.warn(
        `[ai] "${err.exhaustedModel}" quota exhausted, retrying exam generation on "${aiConfig.models.economy}"`
      );
      ({ text, usage } = await call('economy'));
    }

    let parsed;
    try {
      parsed = generatedExamSchema.parse(JSON.parse(text));
    } catch {
      // Malformed model output must never reach the teacher as a "paper".
      throw new AppError(
        'The generated paper could not be read back reliably. Please try again.',
        502
      );
    }

    questions = parsed.questions;
    if (actor) await recordUsage({ actor, tool: 'generateExam', tier: 'advanced', usage });
    await writeCache(key, 'generateExam', questions);
  }

  // Run the generated paper through exactly the same deterministic review a
  // hand-written one gets: mark totals, internal repetition, and similarity
  // against the question bank. A model is not trusted to check its own work.
  const review = await reviewExamQualityService({
    questions,
    expectedTotalMarks: totalMarks,
    subjectId,
    classId,
  });

  return {
    status: 'draft',
    subject,
    grade,
    requestedQuestions: questionCount,
    requestedTotalMarks: totalMarks,
    topicsUsed: curriculumTopics,
    topicSource: topics.length > 0 ? 'requested' : curriculumTopics.length > 0 ? 'teaching logs' : 'general curriculum',
    questions,
    review,
    note:
      'This is a draft. Nothing has been scheduled or saved as an exam — review and edit it, then create the paper in the Examinations module.',
  };
};
