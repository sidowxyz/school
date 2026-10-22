import * as ExamResultService from '../services/examResultService.js';
import Student from '../models/Student.js';
import Guardian from '../models/Guardian.js';

/** Service errors carry a status; anything else is a real 500. */
const handle = (err, res, next) => {
  if (err.status === 400 || err.status === 404) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  return next(err);
};

/**
 * GET /api/exam-marks/for?exam_id=&class_id=&subject_id=&section_id=
 * The teacher's marks sheet — existing marks, or a blank sheet built from
 * the live class roster
 */
export const getSubmissionFor = async (req, res, next) => {
  try {
    const { exam_id, class_id, subject_id, section_id } = req.query;
    if (!exam_id || !class_id || !subject_id) {
      return res.status(400).json({
        success: false,
        message: 'exam_id, class_id and subject_id are required'
      });
    }
    const data = await ExamResultService.getSubmissionFor({
      exam_id,
      class_id,
      subject_id,
      section_id: section_id || null
    });
    res.json({ success: true, data });
  } catch (err) {
    handle(err, res, next);
  }
};

/**
 * GET /api/exam-marks
 * List marks submissions, filtered by status / exam / class / subject
 */
export const listSubmissions = async (req, res, next) => {
  try {
    const data = await ExamResultService.listSubmissions(req.query);
    res.json({ success: true, data });
  } catch (err) {
    handle(err, res, next);
  }
};

/**
 * PUT /api/exam-marks
 * Save marks as a draft, or submit them for approval
 */
export const saveSubmission = async (req, res, next) => {
  try {
    const data = await ExamResultService.saveSubmission(req.body, req.user);
    res.json({
      success: true,
      message: data.status === 'submitted' ? 'Marks submitted for approval' : 'Marks saved',
      data
    });
  } catch (err) {
    handle(err, res, next);
  }
};

/**
 * POST /api/exam-marks/:id/approve | /return | /publish
 */
const review = (action) => async (req, res, next) => {
  try {
    const data = await ExamResultService.reviewSubmission(req.params.id, action, {
      reason: req.body?.reason,
      user: req.user
    });
    res.json({ success: true, message: `Marks ${data.status}`, data });
  } catch (err) {
    handle(err, res, next);
  }
};

export const approveSubmission = review('approve');
export const returnSubmission = review('return');
export const publishSubmission = review('publish');

/**
 * POST /api/exam-marks/publish-all
 * Publish every approved submission (optionally scoped to one exam/class)
 */
export const publishAllApproved = async (req, res, next) => {
  try {
    const data = await ExamResultService.publishAllApproved(req.body ?? {}, req.user);
    res.json({
      success: true,
      message: `Published ${data.published} approved submission(s)`,
      data
    });
  } catch (err) {
    handle(err, res, next);
  }
};

/**
 * GET /api/exam-results?class_id=&(exam_period_id|batch_id|exam_id)=
 * Ranked, aggregated results for a class across an examination sitting
 */
export const getClassResults = async (req, res, next) => {
  try {
    const { exam_id, class_id, batch_id, exam_period_id } = req.query;
    const data = await ExamResultService.getClassResults({
      exam_id,
      batch_id,
      exam_period_id,
      class_id
    });
    res.json({ success: true, data });
  } catch (err) {
    handle(err, res, next);
  }
};

/**
 * GET /api/exam-results/analytics?class_id=&(exam_period_id|batch_id|exam_id)=
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const { exam_id, class_id, batch_id, exam_period_id } = req.query;
    const data = await ExamResultService.getAnalytics({
      exam_id,
      batch_id,
      exam_period_id,
      class_id
    });
    res.json({ success: true, data });
  } catch (err) {
    handle(err, res, next);
  }
};

/**
 * GET /api/exam-results/student/:studentId
 *
 * A student may only read their own results and a parent only their own
 * children's — the same IDOR guard markController applies to /api/marks.
 */
export const getStudentResults = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    if (req.user.role === 'student') {
      const own = await Student.findOne({ _id: studentId, userId: req.user._id });
      if (!own) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view these results'
        });
      }
    }

    if (req.user.role === 'parent') {
      // Same linkage rule as the parent portal: the child must list this
      // guardian (see parentPortalController.getLinkedChild).
      const guardian = await Guardian.findOne({ userId: req.user._id });
      const linked = guardian
        ? await Student.findOne({
            _id: studentId,
            isDeleted: false,
            'guardians.guardianId': guardian._id
          })
        : null;
      if (!linked) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view these results'
        });
      }
    }

    const data = await ExamResultService.getStudentResults(studentId);
    res.json({ success: true, data });
  } catch (err) {
    handle(err, res, next);
  }
};
