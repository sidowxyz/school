import Class from '../models/Class.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createClass = async (req, res, next) => {
  try {
    const newClass = await Class.create(req.body);
    res.status(201).json(new ApiResponse(201, newClass, 'Class created successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Class number already exists', 400));
    next(error);
  }
};

export const getClasses = async (req, res, next) => {
  try {
    const classes = await Class.find().populate('lev_no', 'lev_name lev_no');
    res.status(200).json(new ApiResponse(200, classes, 'Classes retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getClassById = async (req, res, next) => {
  try {
    const classData = await Class.findById(req.params.id).populate('lev_no', 'lev_name lev_no');
    if (!classData) return next(new AppError('Class not found', 404));
    res.status(200).json(new ApiResponse(200, classData, 'Class retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateClass = async (req, res, next) => {
  try {
    const updatedClass = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedClass) return next(new AppError('Class not found', 404));
    res.status(200).json(new ApiResponse(200, updatedClass, 'Class updated successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Class number already exists', 400));
    next(error);
  }
};

export const deleteClass = async (req, res, next) => {
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);
    if (!deletedClass) return next(new AppError('Class not found', 404));
    res.status(200).json(new ApiResponse(200, null, 'Class deleted successfully'));
  } catch (error) {
    next(error);
  }
};
