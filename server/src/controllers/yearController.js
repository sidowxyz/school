import Year from '../models/Year.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { resolveCurrentYearId } from '../services/studentService.js';

// The academic year whose Term is currently marked active (same resolution
// studentService.js already uses to default a new student's enrollment
// year) — lets clients pick "the actually active year" instead of
// arbitrarily defaulting to whichever year happens to sort first.
export const getCurrentYear = async (req, res, next) => {
  try {
    const yearId = await resolveCurrentYearId();
    const year = yearId ? await Year.findById(yearId) : null;
    res.status(200).json(new ApiResponse(200, year, year ? 'Current year retrieved successfully' : 'No active term/year found'));
  } catch (error) {
    next(error);
  }
};

export const createYear = async (req, res, next) => {
  try {
    const year = await Year.create(req.body);
    res.status(201).json(new ApiResponse(201, year, 'Year created successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Year already exists', 400));
    next(error);
  }
};

export const getYears = async (req, res, next) => {
  try {
    const years = await Year.find();
    res.status(200).json(new ApiResponse(200, years, 'Years retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getYearById = async (req, res, next) => {
  try {
    const year = await Year.findById(req.params.id);
    if (!year) return next(new AppError('Year not found', 404));
    res.status(200).json(new ApiResponse(200, year, 'Year retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateYear = async (req, res, next) => {
  try {
    const year = await Year.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!year) return next(new AppError('Year not found', 404));
    res.status(200).json(new ApiResponse(200, year, 'Year updated successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Year already exists', 400));
    next(error);
  }
};

export const deleteYear = async (req, res, next) => {
  try {
    const year = await Year.findByIdAndDelete(req.params.id);
    if (!year) return next(new AppError('Year not found', 404));
    res.status(200).json(new ApiResponse(200, null, 'Year deleted successfully'));
  } catch (error) {
    next(error);
  }
};
