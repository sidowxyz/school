import TeacherAssignment from '../models/TeacherAssignment.js';

// @desc   List teacher assignments across the whole school, filterable by
//         teacher/class/term — powers the master timetable grid (by teacher or
//         by class), which spans multiple teachers and can't live under
//         /api/teachers/:id.
// @route  GET /api/assignments?teacherId=&classId=&sectionId=&termId=
export const getAssignments = async (req, res, next) => {
  try {
    const { teacherId, classId, sectionId, termId } = req.query;
    const filter = {};
    if (teacherId) filter.teacherId = teacherId;
    if (classId) filter.classId = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (termId) filter.termId = termId;

    const assignments = await TeacherAssignment.find(filter)
      .populate({
        path: 'teacherId',
        select: 'staffId userId',
        populate: { path: 'userId', select: 'firstName lastName' },
      })
      .populate('subjectId', 'sub_name subjectCode sub_no')
      .populate({
        path: 'classId',
        select: 'cl_name cl_no lev_no',
        populate: { path: 'lev_no', select: 'lev_name lev_no' },
      })
      .populate('sectionId', 'name')
      .populate({
        path: 'termId',
        select: 'name academicYearId workingDays',
        populate: { path: 'academicYearId', select: 'y_name y_no' },
      })
      .populate('timetableSlots.periodId', 'per_no per_name time_in time_out');

    res.status(200).json({ success: true, message: 'Assignments retrieved successfully', data: assignments });
  } catch (error) {
    next(error);
  }
};
