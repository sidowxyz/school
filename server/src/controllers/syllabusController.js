import * as SyllabusService from '../services/SyllabusService.js';

export const createSyllabus = async (req, res, next) => {
  try {
    const result = await SyllabusService.createSyllabus(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getAllSyllabi = async (req, res, next) => {
  try {
    const result = await SyllabusService.getAllSyllabi(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getSyllabusById = async (req, res, next) => {
  try {
    const result = await SyllabusService.getSyllabusById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Syllabus not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateSyllabus = async (req, res, next) => {
  try {
    const result = await SyllabusService.updateSyllabus(req.params.id, req.body);
    if (!result) return res.status(404).json({ success: false, message: 'Syllabus not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteSyllabus = async (req, res, next) => {
  try {
    const result = await SyllabusService.deleteSyllabus(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Syllabus not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
