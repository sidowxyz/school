import * as ResultSheetService from '../services/ResultSheetService.js';

export const createResultSheet = async (req, res, next) => {
  try {
    const result = await ResultSheetService.createResultSheet(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getAllResultSheets = async (req, res, next) => {
  try {
    const result = await ResultSheetService.getAllResultSheets(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getResultSheetById = async (req, res, next) => {
  try {
    const result = await ResultSheetService.getResultSheetById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result sheet not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateResultSheet = async (req, res, next) => {
  try {
    const result = await ResultSheetService.updateResultSheet(req.params.id, req.body);
    if (!result) return res.status(404).json({ success: false, message: 'Result sheet not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteResultSheet = async (req, res, next) => {
  try {
    const result = await ResultSheetService.deleteResultSheet(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result sheet not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
