import * as StaffAttendanceService from '../services/StaffAttendanceService.js';

export const recordAttendance = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await StaffAttendanceService.recordAttendance(req.body, userId);
    res.status(201).json({
      success: true,
      message: 'Staff attendance recorded successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getAttendance = async (req, res, next) => {
  try {
    const result = await StaffAttendanceService.getAttendanceHistory(req.query);
    res.status(200).json({
      success: true,
      pagination: result.pagination,
      data: result.data
    });
  } catch (err) {
    next(err);
  }
};

export const getAttendanceById = async (req, res, next) => {
  try {
    const result = await StaffAttendanceService.getAttendanceById(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Staff attendance record not found'
      });
    }
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const updateAttendance = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await StaffAttendanceService.updateAttendance(req.params.id, req.body, userId);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Staff attendance record not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Staff attendance record updated successfully',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAttendance = async (req, res, next) => {
  try {
    const result = await StaffAttendanceService.deleteAttendance(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Staff attendance record not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Staff attendance record deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const getMonthlyReport = async (req, res, next) => {
  try {
    const { year, month, department } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required query parameters'
      });
    }

    const result = await StaffAttendanceService.generateMonthlyReport(
      parseInt(year),
      parseInt(month),
      department
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const data = await StaffAttendanceService.getSummary({ days: req.query.days });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
