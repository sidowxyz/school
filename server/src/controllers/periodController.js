import Period from '../models/Period.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';

const assertValidTimes = (time_in, time_out) => {
  if (time_in && time_out && time_in >= time_out) {
    throw new AppError(`Invalid period: end time (${time_out}) must be after start time (${time_in}).`, 400);
  }
};

export const createPeriod = async (req, res, next) => {
  try {
    if (!req.body.termId) return next(new AppError('A term is required to create a period.', 400));
    assertValidTimes(req.body.time_in, req.body.time_out);
    const period = await Period.create(req.body);
    res.status(201).json(new ApiResponse(201, period, 'Period created successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('This period number already exists for this term.', 400));
    next(error);
  }
};

export const getPeriods = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.termId) filter.termId = req.query.termId;
    const periods = await Period.find(filter).sort({ time_in: 1 });
    res.status(200).json(new ApiResponse(200, periods, 'Periods retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const getPeriodById = async (req, res, next) => {
  try {
    const period = await Period.findById(req.params.id);
    if (!period) return next(new AppError('Period not found', 404));
    res.status(200).json(new ApiResponse(200, period, 'Period retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export const updatePeriod = async (req, res, next) => {
  try {
    const existing = await Period.findById(req.params.id);
    if (!existing) return next(new AppError('Period not found', 404));

    assertValidTimes(
      req.body.time_in ?? existing.time_in,
      req.body.time_out ?? existing.time_out
    );

    const period = await Period.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json(new ApiResponse(200, period, 'Period updated successfully'));
  } catch (error) {
    if (error.code === 11000) return next(new AppError('This period number already exists for this term.', 400));
    next(error);
  }
};

export const deletePeriod = async (req, res, next) => {
  try {
    const period = await Period.findByIdAndDelete(req.params.id);
    if (!period) return next(new AppError('Period not found', 404));
    res.status(200).json(new ApiResponse(200, null, 'Period deleted successfully'));
  } catch (error) {
    next(error);
  }
};
