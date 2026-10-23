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

    // One round trip for the whole class: upsert each student's mark for this
    // period and day (the unique index is studentId + periodId + att_date).
    const userId = req.user ? req.user.id : null;
    await StudentAttendance.bulkWrite(
      attendance.map(({ studentId, status, remarks }) => ({
        updateOne: {
          filter: { studentId, periodId, att_date: formattedDate },
          update: {
            $set: { status, remarks, updateBy: userId },
            $setOnInsert: { createBy: userId },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );

    const populated = await populateRecord(
      StudentAttendance.find({
        periodId,
        att_date: formattedDate,
        studentId: { $in: attendance.map((r) => r.studentId) },
      })
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
      .select('firstName lastName admissionNumber classId sectionId')
      .populate('classId', 'cl_name cl_no')
      .populate('sectionId', 'name')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    let attendanceRecords = await StudentAttendance.find({
      studentId: { $in: studentIds },
      att_date: { $gte: startDate, $lte: endDate },
    })
      .select('studentId periodId status att_date')
      .lean();

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
        return assignedSlotKeys.has(`${student.classId?._id}_${student.sectionId?._id}_${termId}_${dayName}_${r.periodId}`);
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
        // Late still means in school, so it counts towards attendance (same rule as the overview).
        stats.presentRate = parseFloat((((stats.present + stats.late) / stats.totalDays) * 100).toFixed(2));
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
      overallPresentRate: totalDaysAll > 0 ? parseFloat((((totalPresent + totalLate) / totalDaysAll) * 100).toFixed(2)) : 0,
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

// 7. Overview — today's figures, a daily trend and per-class rates, counted in
// the database so the page never downloads raw records.
const DAY_MS = 24 * 60 * 60 * 1000;
const rate = (present, total) => (total > 0 ? Math.round((present / total) * 1000) / 10 : 0);

export const getAttendanceSummary = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 120);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const from = new Date(today.getTime() - (days - 1) * DAY_MS);

    // Which students are in scope: everyone, or a teacher's own classes/sections.
    const studentFilter = { isDeleted: false, status: 'Active' };
    const teacherAssignments = await getTeacherAssignments(req);
    if (teacherAssignments) {
      const pairs = uniqueClassSectionPairs(teacherAssignments);
      if (pairs.length === 0) studentFilter._id = { $in: [] };
      else studentFilter.$or = pairs.map((p) => ({ classId: p.classId, sectionId: p.sectionId }));
    }
    const students = await Student.find(studentFilter)
      .select('firstName lastName admissionNumber classId')
      .populate('classId', 'cl_name')
      .lean();
    const studentById = new Map(students.map((s) => [String(s._id), s]));
    const ids = students.map((s) => s._id);

    const [byDayStatus, byStudentStatus, absentToday] = await Promise.all([
      StudentAttendance.aggregate([
        { $match: { studentId: { $in: ids }, att_date: { $gte: from, $lte: today } } },
        { $group: { _id: { day: '$att_date', status: '$status' }, n: { $sum: 1 } } },
      ]),
      StudentAttendance.aggregate([
        { $match: { studentId: { $in: ids }, att_date: { $gte: from, $lte: today } } },
        { $group: { _id: { student: '$studentId', status: '$status' }, n: { $sum: 1 } } },
      ]),
      StudentAttendance.find({ studentId: { $in: ids }, att_date: today, status: { $in: ['Absent', 'Late'] } })
        .select('studentId status periodId')
        .populate('periodId', 'per_name')
        .lean(),
    ]);

    const blank = () => ({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });
    const add = (bucket, status, n) => {
      const key = String(status).toLowerCase();
      if (key in bucket) bucket[key] += n;
      bucket.total += n;
    };

    // Totals and the daily series.
    const totals = blank();
    const dayMap = new Map();
    for (const row of byDayStatus) {
      const key = row._id.day.toISOString().slice(0, 10);
      if (!dayMap.has(key)) dayMap.set(key, blank());
      add(dayMap.get(key), row._id.status, row.n);
      add(totals, row._id.status, row.n);
    }
    const todayKey = today.toISOString().slice(0, 10);
    const todayStats = dayMap.get(todayKey) ?? blank();
    const daily = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, b]) => ({ date, ...b, rate: rate(b.present + b.late, b.total) }));

    // Per class, from each student's counts.
    const classMap = new Map();
    for (const row of byStudentStatus) {
      const student = studentById.get(String(row._id.student));
      const name = student?.classId?.cl_name ?? 'No class';
      if (!classMap.has(name)) classMap.set(name, blank());
      add(classMap.get(name), row._id.status, row.n);
    }
    const byClass = [...classMap.entries()]
      .map(([name, b]) => ({ name, ...b, rate: rate(b.present + b.late, b.total) }))
      .sort((a, b) => a.rate - b.rate);

    // Classes with at least one mark today, out of the classes in scope.
    const classesInScope = new Set(students.map((s) => String(s.classId?._id ?? '')).filter(Boolean));
    const markedToday = await StudentAttendance.distinct('studentId', { studentId: { $in: ids }, att_date: today });
    const classesMarked = new Set(markedToday.map((id) => String(studentById.get(String(id))?.classId?._id ?? '')).filter(Boolean));

    res.status(200).json({
      success: true,
      data: {
        days,
        from: from.toISOString().slice(0, 10),
        to: todayKey,
        students: students.length,
        today: { ...todayStats, rate: rate(todayStats.present + todayStats.late, todayStats.total) },
        classesMarkedToday: classesMarked.size,
        classesInScope: classesInScope.size,
        period: { ...totals, rate: rate(totals.present + totals.late, totals.total) },
        daily,
        byClass,
        absentToday: absentToday.slice(0, 20).map((r) => {
          const s = studentById.get(String(r.studentId));
          return {
            studentId: String(r.studentId),
            name: s ? `${s.firstName} ${s.lastName}` : 'Unknown',
            admissionNumber: s?.admissionNumber ?? '',
            className: s?.classId?.cl_name ?? '',
            status: r.status,
            period: r.periodId?.per_name ?? '',
          };
        }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
