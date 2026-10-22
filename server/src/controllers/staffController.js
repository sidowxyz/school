import * as StaffService from '../services/StaffService.js';

export const createStaff = async (req, res, next) => {
  try {
    const result = await StaffService.createStaff(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getAllStaff = async (req, res, next) => {
  try {
    const result = await StaffService.getAllStaff(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getStaffById = async (req, res, next) => {
  try {
    const result = await StaffService.getStaffById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateStaff = async (req, res, next) => {
  try {
    const result = await StaffService.updateStaff(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteStaff = async (req, res, next) => {
  try {
    await StaffService.deleteStaff(req.params.id);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    next(err);
  }
};
