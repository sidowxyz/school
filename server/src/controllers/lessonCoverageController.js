import * as LessonCoverageService from '../services/LessonCoverageService.js';

export const createLessonCoverage = async (req, res, next) => {
  try {
    const result = await LessonCoverageService.createLessonCoverage(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getAllLessonCoverages = async (req, res, next) => {
  try {
    const result = await LessonCoverageService.getAllLessonCoverages(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getLessonCoverageById = async (req, res, next) => {
  try {
    const result = await LessonCoverageService.getLessonCoverageById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Lesson coverage not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateLessonCoverage = async (req, res, next) => {
  try {
    const result = await LessonCoverageService.updateLessonCoverage(req.params.id, req.body);
    if (!result) return res.status(404).json({ success: false, message: 'Lesson coverage not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteLessonCoverage = async (req, res, next) => {
  try {
    const result = await LessonCoverageService.deleteLessonCoverage(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Lesson coverage not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
