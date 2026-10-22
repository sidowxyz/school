import { z } from 'zod';

import aiConfig from '../config/aiConfig.js';
import AppError from '../utils/AppError.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import { extractTextFromDocument } from '../utils/textExtraction.js';
import { assessWritingIntegrity, styleFingerprint } from '../utils/writingStyleSignals.js';
import { getProvider } from '../ai/providers/index.js';
import { assignmentFeedbackPrompt } from '../ai/prompts.js';
import { recordUsage } from '../ai/cache.js';

/**
 * Reviews one uploaded student assignment: writing-integrity signals (see
 * utils/writingStyleSignals.js for why this is signals and not a percentage)
 * and rubric-grounded, concept-level feedback for the teacher.
 */

const feedbackSchema = z.object({
  strengths: z.array(z.string().trim().min(1).max(300)).max(10),
  weaknesses: z.array(z.string().trim().min(1).max(300)).max(10),
  focusAreas: z.array(z.string().trim().min(1).max(200)).max(6),
  suggestedFeedback: z.string().trim().min(1).max(2000),
});

const feedbackResponseSchema = {
  type: 'object',
  properties: {
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    focusAreas: { type: 'array', items: { type: 'string' } },
    suggestedFeedback: { type: 'string' },
  },
  required: ['strengths', 'weaknesses', 'focusAreas', 'suggestedFeedback'],
};

/**
 * Resolves "the student this teacher means" from free text (name or admission
 * number) rather than requiring a student-picker UI. Scoped to the teacher's
 * own assigned classes for a teacher; unrestricted for privileged roles —
 * mirrors the scoping already used for attendance in attendanceController.
 *
 * Requires exactly one match. Multiple or zero matches fail with a message
 * asking for a more specific query, rather than guessing.
 *
 * Deliberately NOT MongoDB $text search, despite that being the obvious first
 * choice and what searchStudents uses. $text does relevance-ranked OR-of-
 * tokens matching: searching an admission number like "ZU-2026-0042" tokenises
 * into "ZU", "2026", "0042" and matches ANY student sharing even one token —
 * in practice, every other student admitted the same year. Two students whose
 * admission numbers differed only in a suffix ("...-IN" vs "...-OUT") both
 * matched a search for one of them. That is tolerable noise for a list the
 * user then scans and picks from by eye; it is not tolerable here, where the
 * single resolved match is trusted and reviewed against — a wrong match means
 * reviewing (and permanently storing feedback about) the wrong student's
 * work. A prefix match is slower to type against but cannot silently resolve
 * to someone else's near-identical identifier.
 */
export const resolveStudentForReview = async (query, actor) => {
  const trimmed = String(query ?? '').trim();
  if (trimmed.length < 2) {
    throw new AppError('Provide the student\'s name or admission number.', 400);
  }

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefix = new RegExp(`^${escaped}`, 'i');
  let candidates = await Student.find({
    isDeleted: false,
    $or: [{ firstName: prefix }, { lastName: prefix }, { admissionNumber: prefix }],
  }).limit(6);

  if (actor.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: actor.id });
    const assignments = teacher ? await TeacherAssignment.find({ teacherId: teacher._id }) : [];
    const allowedPairs = new Set(
      assignments.map((a) => `${a.classId}_${a.sectionId}`)
    );
    candidates = candidates.filter((s) => allowedPairs.has(`${s.classId}_${s.sectionId}`));
  }

  if (candidates.length === 0) {
    throw new AppError(
      actor.role === 'teacher'
        ? 'No student matching that in your own classes. Check the spelling, or this student may not be in a class you teach.'
        : 'No student found matching that.',
      404
    );
  }
  if (candidates.length > 1) {
    const names = candidates.map((s) => `${s.firstName} ${s.lastName}`).join(', ');
    throw new AppError(`More than one match: ${names}. Be more specific.`, 400);
  }

  return candidates[0];
};

const draftFeedback = async ({ text, assignmentTitle, rubric, actor }) => {
  if (!aiConfig.isLlmEnabled) return null;

  try {
    const { text: raw, usage } = await getProvider().complete({
      system: assignmentFeedbackPrompt(),
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            assignmentTitle: assignmentTitle || '(not given)',
            rubric: rubric || '(no rubric given — use the assignment title and content)',
            submission: text,
          }).slice(0, 24000),
        },
      ],
      jsonSchema: feedbackResponseSchema,
      tier: 'economy',
    });

    const parsed = feedbackSchema.parse(JSON.parse(raw));
    if (actor) await recordUsage({ tool: 'assignmentFeedback', tier: 'economy', usage, actor });
    return parsed;
  } catch {
    return null;
  }
};

export const reviewAssignmentUploadService = async ({
  buffer,
  fileName,
  studentQuery,
  assignmentTitle,
  rubric,
  subjectId,
  classId,
  actor,
}) => {
  const student = await resolveStudentForReview(studentQuery, actor);
  const text = await extractTextFromDocument(buffer, fileName);
  const fingerprint = styleFingerprint(text);

  const priorSubmissions = await AssignmentSubmission.find({ studentId: student._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('styleFingerprint');

  const integrity = assessWritingIntegrity(
    text,
    priorSubmissions.map((s) => s.styleFingerprint).filter(Boolean)
  );

  const feedback = await draftFeedback({ text, assignmentTitle, rubric, actor });

  await AssignmentSubmission.create({
    studentId: student._id,
    subjectId: subjectId || null,
    classId: classId || student.classId || null,
    teacherId: actor.id,
    assignmentTitle: assignmentTitle || '',
    rubric: rubric || '',
    submittedText: text,
    wordCount: fingerprint.wordCount,
    fileName,
    styleFingerprint: fingerprint,
  });

  return {
    student: {
      id: student._id.toString(),
      name: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
    },
    assignmentTitle: assignmentTitle || '',
    wordCount: fingerprint.wordCount,
    writingIntegrity: {
      signals: integrity.signals,
      reviewRecommended: integrity.reviewRecommended,
      comparedAgainstSubmissions: integrity.comparedAgainstSubmissions ?? 0,
      note: integrity.note,
    },
    feedback,
    feedbackAvailable: feedback !== null,
    disclaimer:
      'This review supports your judgement — it does not grade the work and does not determine whether it was AI-written.',
  };
};
