import StaffAttendance from '../models/StaffAttendance.js';
import Teacher from '../models/Teacher.js';
import { schoolTodayUTC } from '../utils/schoolTime.js';
import AppError from '../utils/AppError.js';

const populateTeacher = {
  path: 'teacherId',
  select: 'staffId department userId',
  populate: { path: 'userId', select: 'firstName lastName email' },
};

export const recordAttendance = async (data, userId) => {
  const { att_date, attendance } = data;

  const formattedDate = new Date(att_date);
  formattedDate.setUTCHours(0, 0, 0, 0);
  if (Number.isNaN(formattedDate.getTime())) throw new AppError('Pick a valid date.', 400);
  if (formattedDate > schoolTodayUTC()) throw new AppError("Attendance can't be recorded for a future date.", 400);

  // One round trip for the whole staff list. Fields left out of a record
  // (time in/out, remarks) keep whatever was saved before.
  await StaffAttendance.bulkWrite(
    attendance.map(({ teacherId, status, time_in, time_out, remarks }) => {
      const set = { status, updateBy: userId };
      if (time_in !== undefined) set.time_in = time_in;
      if (time_out !== undefined) set.time_out = time_out;
      if (remarks !== undefined) set.remarks = remarks;
      return {
        updateOne: {
          filter: { teacherId, att_date: formattedDate },
          update: { $set: set, $setOnInsert: { createBy: userId } },
          upsert: true,
        },
      };
    }),
    { ordered: false }
  );

  return StaffAttendance.find({ att_date: formattedDate, teacherId: { $in: attendance.map((r) => r.teacherId) } })
    .populate(populateTeacher)
    .populate('createBy', 'firstName lastName email role');
};

export const getAttendanceHistory = async (filters = {}) => {
  const { teacherId, department, status, date, startDate, endDate, page = 1, limit = 100 } = filters;
  const query = {};

  if (teacherId) {
    query.teacherId = teacherId;
  } else if (department) {
    const matchedTeachers = await Teacher.find({ department }).select('_id');
    query.teacherId = { $in: matchedTeachers.map((t) => t._id) };
  }

  if (status) query.status = status;

  if (date) {
    const parsedDate = new Date(date);
    parsedDate.setUTCHours(0, 0, 0, 0);
    query.att_date = parsedDate;
  } else if (startDate || endDate) {
    query.att_date = {};
    if (startDate) {
      const parsedStart = new Date(startDate);
      parsedStart.setUTCHours(0, 0, 0, 0);
      query.att_date.$gte = parsedStart;
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      parsedEnd.setUTCHours(23, 59, 59, 999);
      query.att_date.$lte = parsedEnd;
    }
  }

  const skipIndex = (parseInt(page) - 1) * parseInt(limit);
  const totalRecords = await StaffAttendance.countDocuments(query);
  const totalPages = Math.ceil(totalRecords / parseInt(limit));

  const records = await StaffAttendance.find(query)
    .populate(populateTeacher)
    .populate('createBy', 'firstName lastName email role')
    .populate('updateBy', 'firstName lastName email role')
    .skip(skipIndex)
    .limit(parseInt(limit))
    .sort({ att_date: -1, createdAt: -1 });

  return {
    pagination: { page: parseInt(page), limit: parseInt(limit), totalPages, totalRecords },
    data: records,
  };
};

export const getAttendanceById = async (id) => {
  return StaffAttendance.findById(id)
    .populate(populateTeacher)
    .populate('createBy', 'firstName lastName email role')
    .populate('updateBy', 'firstName lastName email role');
};

export const updateAttendance = async (id, data, userId) => {
  const updateData = { ...data, updateBy: userId };

  return StaffAttendance.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
    .populate(populateTeacher)
    .populate('createBy', 'firstName lastName email role')
    .populate('updateBy', 'firstName lastName email role');
};

export const deleteAttendance = async (id) => {
  return StaffAttendance.findByIdAndDelete(id);
};

export const generateMonthlyReport = async (year, month, department) => {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const teacherFilter = {};
  if (department) teacherFilter.department = department;

  const teacherList = await Teacher.find(teacherFilter).select('staffId department userId').populate('userId', 'firstName lastName').lean();
  const teacherIds = teacherList.map((t) => t._id);

  const attendanceRecords = await StaffAttendance.find({
    teacherId: { $in: teacherIds },
    att_date: { $gte: startDate, $lte: endDate },
  }).select('teacherId status').lean();

  const reportMap = {};
  teacherList.forEach((teacher) => {
    reportMap[teacher._id.toString()] = {
      staff: {
        _id: teacher._id,
        stf_no: teacher.staffId,
        name: teacher.userId ? `${teacher.userId.firstName} ${teacher.userId.lastName}` : 'Unknown',
        department: teacher.department || 'N/A',
        role: 'Teacher',
        job_title: 'Teacher',
      },
      stats: { totalDays: 0, present: 0, absent: 0, late: 0, excused: 0, presentRate: 0 },
    };
  });

  attendanceRecords.forEach((record) => {
    const teacherIdStr = record.teacherId.toString();
    if (!reportMap[teacherIdStr]) return;

    const stats = reportMap[teacherIdStr].stats;
    stats.totalDays += 1;
    if (record.status === 'Present') stats.present += 1;
    else if (record.status === 'Absent') stats.absent += 1;
    else if (record.status === 'Late') stats.late += 1;
    else if (record.status === 'Excused') stats.excused += 1;
  });

  const staffReports = Object.values(reportMap).map((reportItem) => {
    const stats = reportItem.stats;
    if (stats.totalDays > 0) {
      // Late still means at work — the same rule as student attendance.
      stats.presentRate = parseFloat((((stats.present + stats.late) / stats.totalDays) * 100).toFixed(2));
    }
    return reportItem;
  });

  let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalExcused = 0, totalDaysAll = 0;
  staffReports.forEach((item) => {
    totalPresent += item.stats.present;
    totalAbsent += item.stats.absent;
    totalLate += item.stats.late;
    totalExcused += item.stats.excused;
    totalDaysAll += item.stats.totalDays;
  });

  const summary = {
    totalStaff: teacherList.length,
    totalWorkingDaysRecorded: totalDaysAll,
    overallPresentRate: totalDaysAll > 0 ? parseFloat((((totalPresent + totalLate) / totalDaysAll) * 100).toFixed(2)) : 0,
    overallAbsentRate: totalDaysAll > 0 ? parseFloat(((totalAbsent / totalDaysAll) * 100).toFixed(2)) : 0,
    overallLateRate: totalDaysAll > 0 ? parseFloat(((totalLate / totalDaysAll) * 100).toFixed(2)) : 0,
    overallExcusedRate: totalDaysAll > 0 ? parseFloat(((totalExcused / totalDaysAll) * 100).toFixed(2)) : 0,
  };

  return { reportDate: { year, month }, summary, staffReports };
};

// Overview — today's figures, a daily trend and who has missed most, counted in
// the database so the page never downloads raw records.
const DAY_MS = 24 * 60 * 60 * 1000;
const rate = (attended, total) => (total > 0 ? Math.round((attended / total) * 1000) / 10 : 0);
const teacherName = (t) => (t?.userId ? `${t.userId.firstName ?? ''} ${t.userId.lastName ?? ''}`.trim() : t?.staffId ?? 'Unknown');

export const getSummary = async ({ days = 30 } = {}) => {
  const span = Math.min(Math.max(parseInt(days, 10) || 30, 7), 120);
  const today = schoolTodayUTC();
  const from = new Date(today.getTime() - (span - 1) * DAY_MS);

  const teachers = await Teacher.find({ status: { $ne: 'Inactive' } })
    .select('staffId department userId')
    .populate('userId', 'firstName lastName')
    .lean();
  const byId = new Map(teachers.map((t) => [String(t._id), t]));
  const ids = teachers.map((t) => t._id);

  const [byDayStatus, byTeacherStatus, todayRows] = await Promise.all([
    StaffAttendance.aggregate([
      { $match: { teacherId: { $in: ids }, att_date: { $gte: from, $lte: today } } },
      { $group: { _id: { day: '$att_date', status: '$status' }, n: { $sum: 1 } } },
    ]),
    StaffAttendance.aggregate([
      { $match: { teacherId: { $in: ids }, att_date: { $gte: from, $lte: today } } },
      { $group: { _id: { teacher: '$teacherId', status: '$status' }, n: { $sum: 1 } } },
    ]),
    StaffAttendance.find({ teacherId: { $in: ids }, att_date: today }).select('teacherId status time_in remarks').lean(),
  ]);

  const blank = () => ({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });
  const add = (bucket, status, n) => {
    const key = String(status).toLowerCase();
    if (key in bucket) bucket[key] += n;
    bucket.total += n;
  };

  const totals = blank();
  const dayMap = new Map();
  for (const row of byDayStatus) {
    const key = row._id.day.toISOString().slice(0, 10);
    if (!dayMap.has(key)) dayMap.set(key, blank());
    add(dayMap.get(key), row._id.status, row.n);
    add(totals, row._id.status, row.n);
  }
  const daily = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, b]) => ({ date, ...b, rate: rate(b.present + b.late, b.total) }));

  const todayStats = blank();
  for (const r of todayRows) add(todayStats, r.status, 1);

  // Staff with the most absences in the period (late counts as attended).
  const perTeacher = new Map();
  for (const row of byTeacherStatus) {
    const key = String(row._id.teacher);
    if (!perTeacher.has(key)) perTeacher.set(key, blank());
    add(perTeacher.get(key), row._id.status, row.n);
  }
  const mostAbsent = [...perTeacher.entries()]
    .filter(([, b]) => b.absent > 0)
    .map(([id, b]) => ({ teacherId: id, name: teacherName(byId.get(id)), department: byId.get(id)?.department ?? '', ...b, rate: rate(b.present + b.late, b.total) }))
    .sort((a, b) => b.absent - a.absent || a.rate - b.rate)
    .slice(0, 8);

  return {
    days: span,
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    staff: teachers.length,
    today: { ...todayStats, rate: rate(todayStats.present + todayStats.late, todayStats.total), notMarked: Math.max(0, teachers.length - todayRows.length) },
    period: { ...totals, rate: rate(totals.present + totals.late, totals.total) },
    daily,
    mostAbsent,
    awayToday: todayRows
      .filter((r) => r.status !== 'Present')
      .map((r) => ({ teacherId: String(r.teacherId), name: teacherName(byId.get(String(r.teacherId))), status: r.status, time_in: r.time_in ?? '', remarks: r.remarks ?? '' })),
  };
};
