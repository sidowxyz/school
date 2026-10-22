import StaffAttendance from '../models/StaffAttendance.js';
import Teacher from '../models/Teacher.js';

const populateTeacher = {
  path: 'teacherId',
  select: 'staffId department userId',
  populate: { path: 'userId', select: 'firstName lastName email' },
};

export const recordAttendance = async (data, userId) => {
  const { att_date, attendance } = data;

  const formattedDate = new Date(att_date);
  formattedDate.setUTCHours(0, 0, 0, 0);

  const savedRecords = [];

  for (const record of attendance) {
    const { teacherId, status, time_in, time_out, remarks } = record;

    let attendanceRecord = await StaffAttendance.findOne({ teacherId, att_date: formattedDate });

    if (attendanceRecord) {
      attendanceRecord.status = status;
      if (time_in !== undefined) attendanceRecord.time_in = time_in;
      if (time_out !== undefined) attendanceRecord.time_out = time_out;
      if (remarks !== undefined) attendanceRecord.remarks = remarks;
      attendanceRecord.updateBy = userId;
      await attendanceRecord.save();
    } else {
      attendanceRecord = await StaffAttendance.create({
        teacherId,
        status,
        att_date: formattedDate,
        time_in,
        time_out,
        remarks,
        createBy: userId,
      });
    }

    savedRecords.push(attendanceRecord);
  }

  return StaffAttendance.find({ _id: { $in: savedRecords.map((r) => r._id) } })
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

  const teacherList = await Teacher.find(teacherFilter).populate('userId', 'firstName lastName');
  const teacherIds = teacherList.map((t) => t._id);

  const attendanceRecords = await StaffAttendance.find({
    teacherId: { $in: teacherIds },
    att_date: { $gte: startDate, $lte: endDate },
  });

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
      stats.presentRate = parseFloat(((stats.present / stats.totalDays) * 100).toFixed(2));
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
    overallPresentRate: totalDaysAll > 0 ? parseFloat(((totalPresent / totalDaysAll) * 100).toFixed(2)) : 0,
    overallAbsentRate: totalDaysAll > 0 ? parseFloat(((totalAbsent / totalDaysAll) * 100).toFixed(2)) : 0,
    overallLateRate: totalDaysAll > 0 ? parseFloat(((totalLate / totalDaysAll) * 100).toFixed(2)) : 0,
    overallExcusedRate: totalDaysAll > 0 ? parseFloat(((totalExcused / totalDaysAll) * 100).toFixed(2)) : 0,
  };

  return { reportDate: { year, month }, summary, staffReports };
};
