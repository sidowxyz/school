import Term from '../models/Term.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createTerm = async (req, res, next) => {
  try {
    const term = await Term.create(req.body);
    res.status(201).json(new ApiResponse(201, term, 'Term created successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Term already exists for this year', 400));
    next(error);
  }
};

export const getTerms = async (req, res, next) => {
  try {
    const terms = await Term.find().populate('academicYearId', 'y_name y_no');
    res.status(200).json(new ApiResponse(200, terms, 'Terms retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getTermById = async (req, res, next) => {
  try {
    const term = await Term.findById(req.params.id).populate('academicYearId', 'y_name y_no');
    if (!term) return next(new AppError('Term not found', 404));
    res.status(200).json(new ApiResponse(200, term, 'Term retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateTerm = async (req, res, next) => {
  try {
    const term = await Term.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!term) return next(new AppError('Term not found', 404));
    res.status(200).json(new ApiResponse(200, term, 'Term updated successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Term already exists for this year', 400));
    next(error);
  }
};

export const deleteTerm = async (req, res, next) => {
  try {
    const term = await Term.findByIdAndDelete(req.params.id);
    if (!term) return next(new AppError('Term not found', 404));
    res.status(200).json(new ApiResponse(200, null, 'Term deleted successfully'));
  } catch (error) {
    next(error);
  }
};
