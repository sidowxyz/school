import CourseClass from '../models/CourseClass.js';

export const createCourseClass = async (data) => {
  const courseClass = await CourseClass.create(data);
  return courseClass;
};

export const getAllCourseClasses = async (filter = {}) => {
  return await CourseClass.find(filter);
};

export const getCourseClassById = async (id) => {
  return await CourseClass.findById(id);
};

export const updateCourseClass = async (id, data) => {
  return await CourseClass.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteCourseClass = async (id) => {
  return await CourseClass.findByIdAndDelete(id);
};
