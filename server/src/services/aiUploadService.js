import AppError from '../utils/AppError.js';
import { logAudit } from '../utils/auditHelper.js';
import { buildActor } from '../ai/actor.js';
import { AI_AUDIT_MODULE } from '../ai/orchestrator.js';
import { reviewAssignmentUploadService } from './assignmentReviewService.js';

/**
 * Auth, role gating and audit logging for the assignment upload-review route.
 *
 * This sits outside the tool registry: a multipart file upload doesn't fit
 * the JSON-args shape every other tool takes, so there is no `resolveTool` to
 * reuse here. Roles are checked explicitly instead.
 */

const ASSIGNMENT_REVIEW_ROLES = ['admin', 'principal', 'academic_officer', 'teacher'];

const requireFile = (req) => {
  if (!req.file) throw new AppError('Attach a file to review.', 400);
  return req.file;
};

const requireRole = (actor, allowed) => {
  if (!allowed.includes(actor.role)) {
    throw new AppError('That action is not available for your role.', 403);
  }
};

export const reviewAssignmentUploadHttpService = async (req) => {
  const actor = buildActor(req.user);
  if (!actor) throw new AppError('Not authenticated.', 401);
  requireRole(actor, ASSIGNMENT_REVIEW_ROLES);
  const file = requireFile(req);

  const { studentQuery, assignmentTitle, rubric, subjectId, classId } = req.body;
  if (!studentQuery) throw new AppError('Provide the student\'s name or admission number.', 400);

  let result;
  let failed = false;
  try {
    result = await reviewAssignmentUploadService({
      buffer: file.buffer,
      fileName: file.originalname,
      studentQuery,
      assignmentTitle,
      rubric,
      subjectId,
      classId,
      actor,
    });
  } catch (err) {
    failed = true;
    throw err;
  } finally {
    // Never the submission text, feedback, or the student's name in full —
    // just enough to trace that a review happened. AuditLog requires a
    // non-null record_id, and the student is often never resolved on a
    // failure (bad role, no file, ambiguous query) — falling back to the file
    // name keeps failed attempts audited too, rather than silently dropped
    // by logAudit's internal validation-error catch.
    await logAudit({
      userId: actor.id,
      action: failed ? 'AI_ASSIGNMENT_UPLOAD_FAILED' : 'AI_ASSIGNMENT_UPLOAD_REVIEW',
      module: AI_AUDIT_MODULE,
      recordId: result?.student?.id ?? file?.originalname ?? 'unknown',
      after: {
        fileSize: file.size,
        reviewRecommended: result?.writingIntegrity?.reviewRecommended ?? null,
        feedbackAvailable: result?.feedbackAvailable ?? null,
      },
      ip: req.ip,
    });
  }

  return result;
};
