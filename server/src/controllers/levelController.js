import Level from '../models/Level.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createLevel = async (req, res, next) => {
  try {
    const level = await Level.create(req.body);
    res.status(201).json(new ApiResponse(201, level, 'Level created successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Level number already exists', 400));
    next(error);
  }
};

export const getLevels = async (req, res, next) => {
  try {
    const levels = await Level.find();
    res.status(200).json(new ApiResponse(200, levels, 'Levels retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getLevelById = async (req, res, next) => {
  try {
    const level = await Level.findById(req.params.id);
    if (!level) return next(new AppError('Level not found', 404));
    res.status(200).json(new ApiResponse(200, level, 'Level retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateLevel = async (req, res, next) => {
  try {
    const level = await Level.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!level) return next(new AppError('Level not found', 404));
    res.status(200).json(new ApiResponse(200, level, 'Level updated successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Level number already exists', 400));
    next(error);
  }
};

export const deleteLevel = async (req, res, next) => {
  try {
    const level = await Level.findByIdAndDelete(req.params.id);
    if (!level) return next(new AppError('Level not found', 404));
    res.status(200).json(new ApiResponse(200, null, 'Level deleted successfully'));
  } catch (error) {
    next(error);
  }
};
