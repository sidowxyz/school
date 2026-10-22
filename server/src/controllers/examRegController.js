import * as ExamRegService from '../services/ExamRegService.js';

/**
 * POST /api/exam-reg
 * Register an exam session
 */
export const createExamReg = async (req, res, next) => {
  try {
    if (req.user) req.body.createBy = req.user._id;
    const examReg = await ExamRegService.createExamReg(req.body);
    res.status(201).json({
      success: true,
      message: 'Exam registration created successfully',
      data: examReg
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exam-reg
 * Get all exam registrations with optional filters and pagination
 */
export const getAllExamRegs = async (req, res, next) => {
  try {
    const data = await ExamRegService.getAllExamRegs(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/exam-reg/:id
 * Get a single exam registration by ID
 */
export const getExamRegById = async (req, res, next) => {
  try {
    const examReg = await ExamRegService.getExamRegById(req.params.id);
    if (!examReg) {
      return res.status(404).json({ success: false, message: 'Exam registration not found' });
    }
    res.json({ success: true, data: examReg });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/exam-reg/:id
 * Update an exam registration by ID
 */
export const updateExamReg = async (req, res, next) => {
  try {
    if (req.user) req.body.updateBy = req.user._id;
    const examReg = await ExamRegService.updateExamReg(req.params.id, req.body);
    if (!examReg) {
      return res.status(404).json({ success: false, message: 'Exam registration not found' });
    }
    res.json({
      success: true,
      message: 'Exam registration updated successfully',
      data: examReg
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/exam-reg/:id
 * Delete an exam registration by ID
 */
export const deleteExamReg = async (req, res, next) => {
  try {
    const examReg = await ExamRegService.deleteExamReg(req.params.id);
    if (!examReg) {
      return res.status(404).json({ success: false, message: 'Exam registration not found' });
    }
    res.json({ success: true, message: 'Exam registration deleted successfully' });
  } catch (err) {
    next(err);
  }
};
