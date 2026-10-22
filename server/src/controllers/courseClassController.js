import * as CourseClassService from '../services/CourseClassService.js';

export const createCourseClass = async (req, res, next) => {
  try {
    const result = await CourseClassService.createCourseClass(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getAllCourseClasses = async (req, res, next) => {
  try {
    const result = await CourseClassService.getAllCourseClasses(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getCourseClassById = async (req, res, next) => {
  try {
    const result = await CourseClassService.getCourseClassById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Course class not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateCourseClass = async (req, res, next) => {
  try {
    const result = await CourseClassService.updateCourseClass(req.params.id, req.body);
    if (!result) return res.status(404).json({ success: false, message: 'Course class not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteCourseClass = async (req, res, next) => {
  try {
    const result = await CourseClassService.deleteCourseClass(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Course class not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
