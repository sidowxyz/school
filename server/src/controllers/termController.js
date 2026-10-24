import Term from '../models/Term.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { assertNotInUse } from '../utils/inUse.js';

// Only one term is "active" (the current one): every page that needs "this
// term" — timetable, attendance, enrolment, dashboards — reads that one.
const ALLOWED = ['name', 'academicYearId', 'startDate', 'endDate', 'status', 'workingDays'];
const pick = (body) => Object.fromEntries(ALLOWED.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
const WEEK = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const checkTerm = (data) => {
  if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
    throw new AppError('The term must end after it starts.', 400);
  }
  // Keep working days in week order (Saturday first), whatever order they were ticked in.
  if (Array.isArray(data.workingDays)) data.workingDays = WEEK.filter((d) => data.workingDays.includes(d));
};

const makeOnlyActive = (termId) => Term.updateMany({ _id: { $ne: termId }, status: 'active' }, { status: 'inactive' });

export const createTerm = async (req, res, next) => {
  try {
    const data = pick(req.body);
    checkTerm(data);
    // A term set up ahead of time doesn't take over as the current term.
    if (!data.status) data.status = data.startDate && new Date(data.startDate) > new Date() ? 'inactive' : 'active';
    const term = await Term.create(data);
    if (term.status === 'active') await makeOnlyActive(term._id);
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
    const data = pick(req.body);
    checkTerm(data);
    const term = await Term.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!term) return next(new AppError('Term not found', 404));
    if (term.status === 'active') await makeOnlyActive(term._id);
    res.status(200).json(new ApiResponse(200, term, 'Term updated successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('Term already exists for this year', 400));
    next(error);
  }
};

export const deleteTerm = async (req, res, next) => {
  try {
    await assertNotInUse('term', req.params.id);
    const term = await Term.findByIdAndDelete(req.params.id);
    if (!term) return next(new AppError('Term not found', 404));
    res.status(200).json(new ApiResponse(200, null, 'Term deleted successfully'));
  } catch (error) {
    next(error);
  }
};
