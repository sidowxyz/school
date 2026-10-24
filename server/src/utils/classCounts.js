import Student from '../models/Student.js';

// How many active students sit in each class and section, counted in one query.
// Used by the class and section lists (Academic Structure, the student form)
// and by the section capacity check.
export const activeStudentCounts = async () => {
  const rows = await Student.aggregate([
    { $match: { isDeleted: false, status: 'Active' } },
    { $group: { _id: { classId: '$classId', sectionId: '$sectionId' }, count: { $sum: 1 } } },
  ]);
  const byClass = new Map();
  const bySection = new Map();
  for (const { _id, count } of rows) {
    if (_id.classId) byClass.set(String(_id.classId), (byClass.get(String(_id.classId)) ?? 0) + count);
    if (_id.sectionId) bySection.set(String(_id.sectionId), (bySection.get(String(_id.sectionId)) ?? 0) + count);
  }
  return { byClass, bySection };
};

/** Active students in one section, optionally not counting one student (who is moving in). */
export const sectionHeadcount = (sectionId, exceptStudentId = null, session = null) =>
  Student.countDocuments({
    sectionId,
    isDeleted: false,
    status: 'Active',
    ...(exceptStudentId && { _id: { $ne: exceptStudentId } }),
  }).session(session);
