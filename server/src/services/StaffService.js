import Staff from '../models/Staff.js';

export const createStaff = async (data) => {
  const staff = new Staff(data);
  return await staff.save();
};

export const getStaffById = async (id) => {
  return await Staff.findById(id)
    .populate('p_no')
    .populate('dep_no')
    .populate('role_no')
    .populate('job_no');
};

export const getAllStaff = async (filter = {}) => {
  return await Staff.find(filter)
    .populate('p_no')
    .populate('dep_no')
    .populate('role_no')
    .populate('job_no');
};

export const updateStaff = async (id, data) => {
  return await Staff.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteStaff = async (id) => {
  return await Staff.findByIdAndDelete(id);
};
