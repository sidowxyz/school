import ExamReg from '../models/ExamReg.js';

/**
 * Create a new ExamReg
 */
export const createExamReg = async (data) => {
  const examReg = await ExamReg.create(data);
  return ExamReg.findById(examReg._id)
    .populate('ex_no', 'ex_no ex_name')
    .populate('y_no', 'y_no y_name')
    .populate('createBy', 'username')
    .populate('updateBy', 'username');
};

/**
 * Get all ExamRegs with optional filtering and pagination
 */
export const getAllExamRegs = async (query = {}) => {
  const { ex_no, y_no, page = 1, limit = 20 } = query;
  const filter = {};

  if (ex_no) filter.ex_no = ex_no;
  if (y_no) filter.y_no = y_no;

  const skip = (Number(page) - 1) * Number(limit);
  const total = await ExamReg.countDocuments(filter);
  const examRegs = await ExamReg.find(filter)
    .populate('ex_no', 'ex_no ex_name')
    .populate('y_no', 'y_no y_name')
    .populate('createBy', 'username')
    .populate('updateBy', 'username')
    .sort({ createDate: -1 })
    .skip(skip)
    .limit(Number(limit));

  return { total, page: Number(page), limit: Number(limit), examRegs };
};

/**
 * Get a single ExamReg by MongoDB _id
 */
export const getExamRegById = async (id) => {
  return await ExamReg.findById(id)
    .populate('ex_no', 'ex_no ex_name')
    .populate('y_no', 'y_no y_name')
    .populate('createBy', 'username')
    .populate('updateBy', 'username');
};

/**
 * Update an ExamReg by MongoDB _id
 */
export const updateExamReg = async (id, data) => {
  data.updateDate = new Date();
  return await ExamReg.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true
  })
    .populate('ex_no', 'ex_no ex_name')
    .populate('y_no', 'y_no y_name')
    .populate('createBy', 'username')
    .populate('updateBy', 'username');
};

/**
 * Delete an ExamReg by MongoDB _id
 */
export const deleteExamReg = async (id) => {
  return await ExamReg.findByIdAndDelete(id);
};
