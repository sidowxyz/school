import Section from '../models/Section.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { assertNotInUse } from '../utils/inUse.js';
import { activeStudentCounts } from '../utils/classCounts.js';

// An empty capacity field means "no limit".
const cleanCapacity = (body) => {
  if ('capacity' in body) body.capacity = body.capacity === '' || body.capacity === null || body.capacity === undefined ? null : Number(body.capacity);
  return body;
};

export const createSection = async (req, res, next) => {
  try {
    const section = await Section.create(cleanCapacity(req.body));
    res.status(201).json(new ApiResponse(201, section, 'Section created successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSections = async (req, res, next) => {
  try {
    const [sections, { bySection }] = await Promise.all([
      Section.find()
        .populate('class', 'cl_name cl_no')
        .populate({ path: 'classTeacherId', select: 'staffId userId', populate: { path: 'userId', select: 'firstName lastName' } })
        .lean(),
      activeStudentCounts(),
    ]);
    const withCounts = sections.map((s) => ({ ...s, studentCount: bySection.get(String(s._id)) ?? 0 }));
    res.status(200).json(new ApiResponse(200, withCounts, 'Sections retrieved successfully'));
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
    const section = await Section.findByIdAndUpdate(req.params.id, cleanCapacity(req.body), { new: true, runValidators: true });
    if (!section) return next(new AppError('Section not found', 404));
    res.status(200).json(new ApiResponse(200, section, 'Section updated successfully'));
  } catch (error) {
    next(error);
  }
};

export const deleteSection = async (req, res, next) => {
  try {
    await assertNotInUse('section', req.params.id);
    const section = await Section.findByIdAndDelete(req.params.id);
    if (!section) return next(new AppError('Section not found', 404));
    res.status(200).json(new ApiResponse(200, null, 'Section deleted successfully'));
  } catch (error) {
    next(error);
  }
};
