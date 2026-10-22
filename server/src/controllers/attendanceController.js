import StudentAttendance from '../models/StudentAttendance.js';
import StudentClass from '../models/StudentClass.js';
import Status from '../models/Status.js';
import Period from '../models/Period.js';
import Student from '../models/Student.js';
import Term from '../models/Term.js';
import Teacher from '../models/Teacher.js';
import TeacherAssignment from '../models/TeacherAssignment.js';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyReportResponse = (year, month) => ({
  success: true,
  data: {
    reportDate: { year: parseInt(year), month: parseInt(month) },
    summary: { totalStudents: 0, totalWorkingDaysRecorded: 0, overallPresentRate: 0, overallAbsentRate: 0, overallLateRate: 0, overallExcusedRate: 0 },
    studentReports: [],
  },
});

// A teacher only ever sees their own classes/sections, never the whole school's —
// resolves to null for non-teacher roles (no restriction applies to them).
const getTeacherAssignments = async (req) => {
  if (req.user?.role !== 'teacher') return null;
  const teacher = await Teacher.findOne({ userId: req.user.id });
  if (!teacher) return [];
  return TeacherAssignment.find({ teacherId: teacher._id });
};

const uniqueClassSectionPairs = (assignments) => [
  ...new Map(assignments.map((a) => [`${a.classId}_${a.sectionId}`, { classId: a.classId, sectionId: a.sectionId }])).values(),
];

const emptyAttendanceList = (limit) => ({
  success: true,
  pagination: { page: 1, limit: parseInt(limit), totalPages: 0, totalRecords: 0 },
  data: [],
});

const populateRecord = (query) =>
  query
    .populate({
      path: 'studentId',
      select: 'firstName lastName admissionNumber classId sectionId',
      populate: [
        { path: 'classId', select: 'cl_name cl_no' },
        { path: 'sectionId', select: 'name' },
      ],
    })
    .populate('periodId', 'per_no per_name time_in time_out')
    .populate('createBy', 'firstName lastName email role')
    .populate('updateBy', 'firstName lastName email role');

// 1. Mark Attendance (bulk upsert per student for a given period/date)
export const markAttendance = async (req, res) => {
  try {
    const { periodId, att_date, attendance } = req.body;

    const formattedDate = new Date(att_date);
    formattedDate.setUTCHours(0, 0, 0, 0);

    const period = await Period.findById(periodId);
    if (!period) {
      return res.status(404).json({ success: false, message: 'Period not found' });
    }

    // Admin/principal/academic_officer can override (e.g. to fix a mistake or log a
    // makeup session); a 'teacher' is locked to their own working days and assignments.
    if (req.user?.role === 'teacher') {
      const dayName = WEEKDAY_NAMES[formattedDate.getUTCDay()];

      const term = await Term.findById(period.termId);
      if (!term || !term.workingDays.includes(dayName)) {
        return res.status(403).json({ success: false, message: `${dayName} is not a teaching day for this term.` });
      }

      const firstStudent = await Student.findById(attendance[0].studentId).select('classId sectionId');
      if (!firstStudent) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) {
        return res.status(403).json({ success: false, message: 'No teacher profile is linked to this account.' });
      }

      const assignment = await TeacherAssignment.findOne({
        teacherId: teacher._id,
        classId: firstStudent.classId,
        sectionId: firstStudent.sectionId,
        termId: period.termId,
        timetableSlots: { $elemMatch: { day: dayName, periodId: period._id } },
      });

      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to teach this class/section during this period.' });
      }
    }

    const savedRecords = [];

    for (const record of attendance) {
      const { studentId, status, remarks } = record;

      let attendanceRecord = await StudentAttendance.findOne({
        studentId,
        periodId,
        att_date: formattedDate,
      });

      if (attendanceRecord) {
        attendanceRecord.status = status;
        attendanceRecord.remarks = remarks;
        attendanceRecord.updateBy = req.user ? req.user.id : null;
        await attendanceRecord.save();
      } else {
        attendanceRecord = await StudentAttendance.create({
          studentId,
          periodId,
          status,
          remarks,
          att_date: formattedDate,
          createBy: req.user ? req.user.id : null,
        });
      }

      savedRecords.push(attendanceRecord);
    }

    const populated = await populateRecord(
      StudentAttendance.find({ _id: { $in: savedRecords.map((r) => r._id) } })
    );

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      count: populated.length,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get Attendance History (filterable by student, class+section, period, date)
export const getAttendance = async (req, res) => {
  try {
    const { classId, sectionId, studentId, periodId, date, status, page = 1, limit = 100 } = req.query;

    const query = {};
    if (periodId) query.periodId = periodId;
    if (status) query.status = status;

    if (date) {
      const parsedDate = new Date(date);
      parsedDate.setUTCHours(0, 0, 0, 0);
      query.att_date = parsedDate;
    }

    // Teachers only ever see their own classes/sections, never the whole school's.
    const teacherAssignments = await getTeacherAssignments(req);
    const assignedPairs = teacherAssignments ? uniqueClassSectionPairs(teacherAssignments) : null;
    const isAssignedPair = (cId, sId) =>
      assignedPairs.some((p) => (!cId || p.classId.toString() === cId) && (!sId || p.sectionId.toString() === sId));

    if (studentId) {
      if (assignedPairs) {
        const student = await Student.findById(studentId).select('classId sectionId');
        if (!student || !isAssignedPair(student.classId?.toString(), student.sectionId?.toString())) {
          return res.status(200).json(emptyAttendanceList(limit));
        }
      }
      query.studentId = studentId;
    } else if (classId || sectionId) {
      if (assignedPairs && !isAssignedPair(classId, sectionId)) {
        return res.status(200).json(emptyAttendanceList(limit));
      }
      const studentFilter = { isDeleted: false };
      if (classId) studentFilter.classId = classId;
      if (sectionId) studentFilter.sectionId = sectionId;
      const students = await Student.find(studentFilter).select('_id');
      query.studentId = { $in: students.map((s) => s._id) };
    } else if (assignedPairs) {
      if (assignedPairs.length === 0) return res.status(200).json(emptyAttendanceList(limit));
      const students = await Student.find({
        isDeleted: false,
        $or: assignedPairs.map((p) => ({ classId: p.classId, sectionId: p.sectionId })),
      }).select('_id');
      query.studentId = { $in: students.map((s) => s._id) };
    }

    const skipIndex = (parseInt(page) - 1) * parseInt(limit);
    const totalRecords = await StudentAttendance.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / parseInt(limit));

    const records = await populateRecord(StudentAttendance.find(query))
      .skip(skipIndex)
      .limit(parseInt(limit))
      .sort({ att_date: -1 });

    res.status(200).json({
      success: true,
      pagination: { page: parseInt(page), limit: parseInt(limit), totalPages, totalRecords },
      data: records,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get Monthly Report
export const getMonthlyReport = async (req, res) => {
  try {
    const { year, month, classId, sectionId } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required query parameters',
      });
    }

    const startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1));
    const endDate = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999));

    const studentFilter = { isDeleted: false };
    if (classId) studentFilter.classId = classId;
    if (sectionId) studentFilter.sectionId = sectionId;

    // Teachers only ever see their own classes/sections, never the whole school's.
    const teacherAssignments = await getTeacherAssignments(req);
    if (teacherAssignments) {
      const assignedPairs = uniqueClassSectionPairs(teacherAssignments);
      if (classId || sectionId) {
        const allowed = assignedPairs.some(
          (p) => (!classId || p.classId.toString() === classId) && (!sectionId || p.sectionId.toString() === sectionId)
        );
        if (!allowed) return res.status(200).json(emptyReportResponse(year, month));
      } else {
        if (assignedPairs.length === 0) return res.status(200).json(emptyReportResponse(year, month));
        studentFilter.$or = assignedPairs.map((p) => ({ classId: p.classId, sectionId: p.sectionId }));
      }
    }

    const students = await Student.find(studentFilter)
      .populate('classId', 'cl_name cl_no')
      .populate('sectionId', 'name');

    const studentIds = students.map((s) => s._id);

    let attendanceRecords = await StudentAttendance.find({
      studentId: { $in: studentIds },
      att_date: { $gte: startDate, $lte: endDate },
    });

    // Precision pass: even within an assigned class/section, a teacher only sees
    // attendance for the exact period + weekday slot they're actually timetabled for.
    if (teacherAssignments) {
      const periodIds = [...new Set(attendanceRecords.map((r) => r.periodId.toString()))];
      const periods = await Period.find({ _id: { $in: periodIds } });
      const periodTermMap = new Map(periods.map((p) => [p._id.toString(), p.termId.toString()]));
      const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

      const assignedSlotKeys = new Set();
      teacherAssignments.forEach((a) => {
        a.timetableSlots.forEach((slot) => {
          if (!slot.periodId) return;
          assignedSlotKeys.add(`${a.classId}_${a.sectionId}_${a.termId}_${slot.day}_${slot.periodId}`);
        });
      });

      attendanceRecords = attendanceRecords.filter((r) => {
        const student = studentMap.get(r.studentId.toString());
        const termId = periodTermMap.get(r.periodId.toString());
        if (!student || !termId) return false;
        const dayName = WEEKDAY_NAMES[new Date(r.att_date).getUTCDay()];
        return assignedSlotKeys.has(`${student.classId._id}_${student.sectionId._id}_${termId}_${dayName}_${r.periodId}`);
      });
    }

    const reportMap = {};
    students.forEach((student) => {
      reportMap[student._id.toString()] = {
        student: {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          class: student.classId,
          section: student.sectionId,
        },
        stats: { totalDays: 0, present: 0, absent: 0, late: 0, excused: 0, presentRate: 0 },
      };
    });

    attendanceRecords.forEach((record) => {
      const studentIdStr = record.studentId.toString();
      if (!reportMap[studentIdStr]) return;

      const stats = reportMap[studentIdStr].stats;
      stats.totalDays += 1;
      if (record.status === 'Present') stats.present += 1;
      else if (record.status === 'Absent') stats.absent += 1;
      else if (record.status === 'Late') stats.late += 1;
      else if (record.status === 'Excused') stats.excused += 1;
    });

    const studentReports = Object.values(reportMap).map((item) => {
      const stats = item.stats;
      if (stats.totalDays > 0) {
        stats.presentRate = parseFloat(((stats.present / stats.totalDays) * 100).toFixed(2));
      }
      return item;
    });

    let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalExcused = 0, totalDaysAll = 0;
    studentReports.forEach((item) => {
      totalPresent += item.stats.present;
      totalAbsent += item.stats.absent;
      totalLate += item.stats.late;
      totalExcused += item.stats.excused;
      totalDaysAll += item.stats.totalDays;
    });

    const summary = {
      totalStudents: students.length,
      totalWorkingDaysRecorded: totalDaysAll,
      overallPresentRate: totalDaysAll > 0 ? parseFloat(((totalPresent / totalDaysAll) * 100).toFixed(2)) : 0,
      overallAbsentRate: totalDaysAll > 0 ? parseFloat(((totalAbsent / totalDaysAll) * 100).toFixed(2)) : 0,
      overallLateRate: totalDaysAll > 0 ? parseFloat(((totalLate / totalDaysAll) * 100).toFixed(2)) : 0,
      overallExcusedRate: totalDaysAll > 0 ? parseFloat(((totalExcused / totalDaysAll) * 100).toFixed(2)) : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        reportDate: { year: parseInt(year), month: parseInt(month) },
        summary,
        studentReports,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Get All Attendance Statuses
export const getAttendanceStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({});
    res.status(200).json({
      success: true,
      data: statuses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get All Periods
export const getPeriods = async (req, res) => {
  try {
    const periods = await Period.find({}).sort({ per_no: 1 });
    res.status(200).json({
      success: true,
      data: periods
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Get Enrolled Students for a Class and Year
export const getEnrolledStudents = async (req, res) => {
  try {
    const { classId, y_no } = req.query;
    if (!classId || !y_no) {
      return res.status(400).json({
        success: false,
        message: 'classId and y_no are required query parameters'
      });
    }

    const enrolled = await StudentClass.find({ class: classId, year: y_no })
      .populate('student');

    res.status(200).json({
      success: true,
      data: enrolled
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
