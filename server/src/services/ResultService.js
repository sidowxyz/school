import Result from '../models/Result.js';

/**
 * Create a new Result
 */
export const createResult = async (data) => {
  const result = await Result.create(data);
  return Result.findById(result._id)
    .populate('ex_r_no', 'ex_r_no started ended total_marks')
    .populate('cc_no', 'cc_no')
    .populate('id', 'first_name last_name st_no')
    .populate('createBy', 'username')
    .populate('updateBy', 'username');
};

/**
 * Get all Results with optional filtering and pagination
 */
export const getAllResults = async (query = {}) => {
  const { ex_r_no, cc_no, student_id, grade, page = 1, limit = 20 } = query;
  const filter = {};

  if (ex_r_no) filter.ex_r_no = ex_r_no;
  if (cc_no) filter.cc_no = cc_no;
  if (student_id) filter.id = student_id;
  if (grade) filter.grade = grade;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Result.countDocuments(filter);
  const results = await Result.find(filter)
    .populate('ex_r_no', 'ex_r_no started ended total_marks')
    .populate('cc_no', 'cc_no')
    .populate('id', 'first_name last_name st_no')
    .populate('createBy', 'username')
    .populate('updateBy', 'username')
    .sort({ createDate: -1 })
    .skip(skip)
    .limit(Number(limit));

  return { total, page: Number(page), limit: Number(limit), results };
};

/**
 * Get a single Result by MongoDB _id
 */
export const getResultById = async (id) => {
  return await Result.findById(id)
    .populate('ex_r_no', 'ex_r_no started ended total_marks')
    .populate('cc_no', 'cc_no')
    .populate('id', 'first_name last_name st_no')
    .populate('createBy', 'username')
    .populate('updateBy', 'username');
};

/**
 * Update a Result by MongoDB _id
 */
export const updateResult = async (id, data) => {
  data.updateDate = new Date();
  return await Result.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  })
    .populate('ex_r_no', 'ex_r_no started ended total_marks')
    .populate('cc_no', 'cc_no')
    .populate('id', 'first_name last_name st_no')
    .populate('createBy', 'username')
    .populate('updateBy', 'username');
};

/**
 * Delete a Result by MongoDB _id
 */
export const deleteResult = async (id) => {
  return await Result.findByIdAndDelete(id);
};
