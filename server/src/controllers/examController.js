import * as ExamService from '../services/examService.js';
import { ScheduleConflictError } from '../services/examService.js';

// Callers that have already seen the clash and want it anyway pass
// ?allowConflicts=true (the timetable UI offers this after warning).
const allowConflicts = (req) => req.query.allowConflicts === 'true';

/**
 * Turn the service's scheduling errors into the right HTTP status:
 * 409 for a clash (with the clashing exams attached so the UI can name
 * them), 400 for an invalid configuration such as end-before-start.
 */
const handleScheduleError = (err, res, next) => {
  if (err instanceof ScheduleConflictError) {
    return res.status(409).json({
      success: false,
      message: err.message,
      conflicts: err.conflicts
    });
  }
  // resolveSchedule / assertMarks throw plain Errors carrying a message
  // written for academic staff, so pass it straight through as a 400.
  if (err.name === 'Error') {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
};

/**
 * POST /api/exams
 * Create a new exam
 */
export const createExam = async (req, res, next) => {
  try {
    // Attach the authenticated user as creator
    if (req.user) req.body.createBy = req.user._id;
    const exam = await ExamService.createExam(req.body, { allowConflicts: allowConflicts(req) });
    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: exam
    });
  } catch (err) {
    handleScheduleError(err, res, next);
  }
};

/**
 * POST /api/exams/bulk
 * Create one exam per class in class_ids, sharing a batch_id
 */
export const createBulkExams = async (req, res, next) => {
  try {
    const exams = await ExamService.createBulkExams(req.body, req.user?._id, {
      allowConflicts: allowConflicts(req)
    });
    res.status(201).json({
      success: true,
      message: `Created ${exams.length} exam(s) across the selected grades`,
      data: exams
    });
  } catch (err) {
    handleScheduleError(err, res, next);
  }
};

/**
 * GET /api/exams
 * Get all exams with optional search, filters and pagination
 */
export const getAllExams = async (req, res, next) => {
  try {
    const data = await ExamService.getAllExams(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exams/timetable
 * Flat, date-ordered exam rows for the examination timetable views,
 * with the ids of any rows that clash
 */
export const getTimetable = async (req, res, next) => {
  try {
    const data = await ExamService.getTimetable(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exams/:id
 * Get a single exam by ID
 */
export const getExamById = async (req, res, next) => {
  try {
    const exam = await ExamService.getExamById(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    res.json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/exams/:id
 * Update an exam by ID
 */
export const updateExam = async (req, res, next) => {
  try {
    if (req.user) req.body.updateBy = req.user._id;
    const exam = await ExamService.updateExam(req.params.id, req.body, {
      allowConflicts: allowConflicts(req)
    });
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: exam
    });
  } catch (err) {
    handleScheduleError(err, res, next);
  }
};

/**
 * PUT /api/exams/batch/:batchId
 * Update every exam sharing a batch_id (a multi-grade exam created together)
 */
export const updateBulkExams = async (req, res, next) => {
  try {
    const exams = await ExamService.updateBulkExams(req.params.batchId, req.body, req.user?._id);
    res.json({
      success: true,
      message: 'Exams updated successfully',
      data: exams
    });
  } catch (err) {
    handleScheduleError(err, res, next);
  }
};

/**
 * DELETE /api/exams/:id
 * Delete an exam by ID
 */
export const deleteExam = async (req, res, next) => {
  try {
    const exam = await ExamService.deleteExam(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }
    res.json({ success: true, message: 'Exam deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/exams/batch/:batchId
 * Delete every exam sharing a batch_id
 */
export const deleteBulkExams = async (req, res, next) => {
  try {
    await ExamService.deleteBulkExams(req.params.batchId);
    res.json({ success: true, message: 'Batch exams deleted successfully' });
  } catch (err) {
    next(err);
  }
};
