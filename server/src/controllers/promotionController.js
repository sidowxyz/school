import mongoose from 'mongoose';
import ApiResponse from '../utils/ApiResponse.js';
import AppError from '../utils/AppError.js';
import { promotionPlan, promotionStudents, runPromotion } from '../services/promotionService.js';

const requireId = (id, message) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError(message, 400);
  return id;
};

// GET /api/promotion/plan?toYearId=
export const getPlan = async (req, res, next) => {
  try {
    const toYearId = requireId(req.query.toYearId, 'Choose the school year students are moving into.');
    res.status(200).json(new ApiResponse(200, await promotionPlan(toYearId), 'Promotion plan'));
  } catch (error) {
    next(error);
  }
};

// GET /api/promotion/students?toYearId=&classId=
export const getStudents = async (req, res, next) => {
  try {
    const toYearId = requireId(req.query.toYearId, 'Choose the school year students are moving into.');
    const classId = requireId(req.query.classId, 'Choose a class.');
    res.status(200).json(new ApiResponse(200, await promotionStudents(toYearId, classId), 'Students to move'));
  } catch (error) {
    next(error);
  }
};

// POST /api/promotion  { toYearId, rules: [...], exceptions: {...} }
export const promote = async (req, res, next) => {
  try {
    const toYearId = requireId(req.body.toYearId, 'Choose the school year students are moving into.');
    const result = await runPromotion({ toYearId, rules: req.body.rules, exceptions: req.body.exceptions ?? {} });
    res.status(200).json(new ApiResponse(200, result, 'Students moved into the new school year'));
  } catch (error) {
    next(error);
  }
};
