import Section from '../models/Section.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createSection = async (req, res, next) => {
  try {
    const section = await Section.create(req.body);
    res.status(201).json(new ApiResponse(201, section, 'Section created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSections = async (req, res, next) => {
  try {
    const sections = await Section.find()
      .populate('class', 'cl_name cl_no')
      .populate({ path: 'classTeacherId', select: 'staffId userId', populate: { path: 'userId', select: 'firstName lastName' } });
    res.status(200).json(new ApiResponse(200, sections, 'Sections retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSectionById = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate('class', 'cl_name cl_no')
      .populate({ path: 'classTeacherId', select: 'staffId userId', populate: { path: 'userId', select: 'firstName lastName' } });
    if (!section) return next(new AppError('Section not found', 404));
    res.status(200).json(new ApiResponse(200, section, 'Section retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateSection = async (req, res, next) => {
  try {
    const section = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!section) return next(new AppError('Section not found', 404));
    res.status(200).json(new ApiResponse(200, section, 'Section updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteSection = async (req, res, next) => {
  try {
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) return next(new AppError('Section not found', 404));
    res.status(200).json(new ApiResponse(200, null, 'Section deleted successfully'));
  } catch (error) {
    next(error);
  }
};
