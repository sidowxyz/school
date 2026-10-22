import ResultSheet from '../models/ResultSheet.js';

export const createResultSheet = async (data) => {
  const resultSheet = new ResultSheet(data);
  return await resultSheet.save();
};

export const getAllResultSheets = async (filter = {}) => {
  return await ResultSheet.find(filter)
    .populate('student')
    .populate('class')
    .populate('examReg')
    .populate('marks.subject');
};

export const getResultSheetById = async (id) => {
  return await ResultSheet.findById(id)
    .populate('student')
    .populate('class')
    .populate('examReg')
    .populate('marks.subject');
};

export const updateResultSheet = async (id, data) => {
  // Find the document first to run hook calculations if needed on save, or use findByIdAndUpdate.
  // In Mongoose, findByIdAndUpdate doesn't run the pre-save hook by default unless we handle it,
  // but we can compute totalScore and averageScore in the service, or fetch and save.
  const sheet = await ResultSheet.findById(id);
  if (!sheet) return null;

  if (data.marks) {
    sheet.marks = data.marks;
  }
  if (data.student) sheet.student = data.student;
  if (data.class) sheet.class = data.class;
  if (data.examReg) sheet.examReg = data.examReg;

  return await sheet.save();
};

export const deleteResultSheet = async (id) => {
  return await ResultSheet.findByIdAndDelete(id);
};
