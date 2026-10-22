import LessonCoverage from '../models/LessonCoverage.js';

export const createLessonCoverage = async (data) => {
  const lessonCoverage = await LessonCoverage.create(data);
  return lessonCoverage;
};

export const getAllLessonCoverages = async (filter = {}) => {
  return await LessonCoverage.find(filter);
};

export const getLessonCoverageById = async (id) => {
  return await LessonCoverage.findById(id);
};

export const updateLessonCoverage = async (id, data) => {
  return await LessonCoverage.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteLessonCoverage = async (id) => {
  return await LessonCoverage.findByIdAndDelete(id);
};
