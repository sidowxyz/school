import * as ExamPeriodService from '../services/examPeriodService.js';

/**
 * POST /api/exam-periods
 * Create an examination period (the window the timetable is built inside)
 */
export const createExamPeriod = async (req, res, next) => {
  try {
    if (req.user) req.body.createBy = req.user._id;
    const period = await ExamPeriodService.createExamPeriod(req.body);
    res.status(201).json({
      success: true,
      message: 'Examination period created successfully',
      data: period
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exam-periods
 */
export const getAllExamPeriods = async (req, res, next) => {
  try {
    const data = await ExamPeriodService.getAllExamPeriods(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exam-periods/:id
 */
export const getExamPeriodById = async (req, res, next) => {
  try {
    const period = await ExamPeriodService.getExamPeriodById(req.params.id);
    if (!period) {
      return res.status(404).json({ success: false, message: 'Examination period not found' });
    }
    res.json({ success: true, data: period });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/exam-periods/:id
 */
export const updateExamPeriod = async (req, res, next) => {
  try {
    if (req.user) req.body.updateBy = req.user._id;
    const period = await ExamPeriodService.updateExamPeriod(req.params.id, req.body);
    if (!period) {
      return res.status(404).json({ success: false, message: 'Examination period not found' });
    }
    res.json({
      success: true,
      message: 'Examination period updated successfully',
      data: period
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/exam-periods/:id
 */
export const deleteExamPeriod = async (req, res, next) => {
  try {
    const period = await ExamPeriodService.deleteExamPeriod(req.params.id);
    if (!period) {
      return res.status(404).json({ success: false, message: 'Examination period not found' });
    }
    res.json({ success: true, message: 'Examination period deleted successfully' });
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({ success: false, message: err.message });
    }
    next(err);
  }
};

/**
 * POST /api/exam-periods/:id/publish
 * Make the period's timetable available to teachers, students and parents
 */
export const publishExamPeriod = async (req, res, next) => {
  try {
    const period = await ExamPeriodService.publishExamPeriod(req.params.id, req.user?._id);
    if (!period) {
      return res.status(404).json({ success: false, message: 'Examination period not found' });
    }
    res.json({ success: true, message: 'Examination timetable published', data: period });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ success: false, message: err.message, details: err.details });
    }
    next(err);
  }
};

/**
 * POST /api/exam-periods/:id/unpublish
 */
export const unpublishExamPeriod = async (req, res, next) => {
  try {
    const period = await ExamPeriodService.unpublishExamPeriod(req.params.id, req.user?._id);
    if (!period) {
      return res.status(404).json({ success: false, message: 'Examination period not found' });
    }
    res.json({ success: true, message: 'Examination timetable returned to draft', data: period });
  } catch (err) {
    next(err);
  }
};
