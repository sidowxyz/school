import Syllabus from '../models/Syllabus.js';

export const createSyllabus = async (data) => {
  const syllabus = await Syllabus.create(data);
  return syllabus;
};

export const getAllSyllabi = async (filter = {}) => {
  return await Syllabus.find(filter);
};

export const getSyllabusById = async (id) => {
  return await Syllabus.findById(id);
};

export const updateSyllabus = async (id, data) => {
  return await Syllabus.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteSyllabus = async (id) => {
  return await Syllabus.findByIdAndDelete(id);
};
