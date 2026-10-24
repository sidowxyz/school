import Subject from '../models/Subject.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { assertNotInUse } from '../utils/inUse.js';

export const createSubject = async (req, res, next) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json(new ApiResponse(201, subject, 'Subject created successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Subject code already exists', 400));
    next(error);
  }
};

export const getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find();
    res.status(200).json(new ApiResponse(200, subjects, 'Subjects retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return next(new AppError('Subject not found', 404));
    res.status(200).json(new ApiResponse(200, subject, 'Subject retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!subject) return next(new AppError('Subject not found', 404));
    res.status(200).json(new ApiResponse(200, subject, 'Subject updated successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Subject code already exists', 400));
    next(error);
  }
};

export const deleteSubject = async (req, res, next) => {
  try {
    await assertNotInUse('subject', req.params.id);
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return next(new AppError('Subject not found', 404));
    res.status(200).json(new ApiResponse(200, null, 'Subject deleted successfully'));
  } catch (error) {
    next(error);
  }
};
