import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Class from '../models/Class.js';
import StudentAttendance from '../models/StudentAttendance.js';
import StudentInvoice from '../models/StudentInvoice.js';
import StudentFee from '../models/StudentFee.js';
import Term from '../models/Term.js';
import SystemSetting from '../models/SystemSetting.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import TeachingLog from '../models/TeachingLog.js';
import AuditLog from '../models/auditLog.model.js';
import AppError from '../utils/AppError.js';
import Guardian from '../models/Guardian.js';
import { schoolTodayUTC } from '../utils/schoolTime.js';

const formatShortDate = (date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * @desc    Get Admin Dashboard KPIs and Charts Data
 * @route   GET /api/v1/analytics/admin-kpis
 * @access  Private (admin, principal, academic officer; fee totals for admin and principal only)
 */
export const getAdminDashboardKPIs = async (req, res, next) => {
  try {
    const now = new Date();

    // 1. Top summary cards
    // Removed (soft-deleted) records never count. Parents are the guardians on
    // record, with or without a portal login.
    const [totalStudents, totalTeachers, totalClasses, totalParents] = await Promise.all([
      Student.countDocuments({ status: 'Active', isDeleted: { $ne: true } }),
      Teacher.countDocuments({ isDeleted: { $ne: true } }),
      Class.countDocuments(),
      Guardian.countDocuments()
    ]);

    // 2. Student distribution by class
    // Student has no `grade` field — grade level is expressed via classId → Class.cl_name.
    const distributionData = await Student.aggregate([
      { $match: { status: 'Active', isDeleted: { $ne: true } } },
      { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'cls' } },
      { $unwind: { path: '$cls', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$cls.cl_name', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const studentDistribution = distributionData.map(item => ({
      name: item._id || 'Unknown',
      value: item.count
    }));

    // 3. This school week's attendance (Saturday to Thursday, Friday only if
    // someone took attendance on it). Late counts as attended, like on the
    // Attendance page; removed students are left out.
    const today = schoolTodayUTC();
    const startOfWeek = new Date(today.getTime() - ((today.getUTCDay() + 1) % 7) * 24 * 60 * 60 * 1000);
    const activeIds = await Student.find({ isDeleted: { $ne: true } }).distinct('_id');

    const attendanceRaw = await StudentAttendance.aggregate([
      { $match: { att_date: { $gte: startOfWeek, $lte: today }, studentId: { $in: activeIds } } },
      {
        $group: {
          _id: { dayOfWeek: { $dayOfWeek: '$att_date' }, statusName: { $toLower: '$status' } },
          count: { $sum: 1 }
        }
      }
    ]);

    // $dayOfWeek: 1 = Sunday ... 7 = Saturday.
    const daysMap = { 7: 'Sat', 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri' };
    const attendanceFormatted = Object.fromEntries(
      ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => [day, { day, present: 0, absent: 0, excused: 0 }]),
    );

    attendanceRaw.forEach(item => {
      const day = attendanceFormatted[daysMap[item._id.dayOfWeek]];
      if (!day) return;
      if (item._id.statusName === 'present' || item._id.statusName === 'late') day.present += item.count;
      else if (item._id.statusName === 'absent') day.absent += item.count;
      else day.excused += item.count;
    });

    const weeklyData = Object.values(attendanceFormatted)
      .filter((d) => d.day !== 'Fri' || d.present + d.absent + d.excused > 0);
    const totalPresent = weeklyData.reduce((sum, d) => sum + d.present, 0);
    const totalMarked = weeklyData.reduce((sum, d) => sum + d.present + d.absent + d.excused, 0);
    const attendanceRate = totalMarked > 0
      ? Math.round((totalPresent / totalMarked) * 1000) / 10
      : 0;

    // 4. Fee collection summary (from the active StudentInvoice ledger)
    const feeAgg = await StudentInvoice.aggregate([
      {
        $group: {
          _id: null,
          totalCollected: { $sum: '$paid_amount' },
          totalExpected: { $sum: '$invoice_amount' },
          totalPending: { $sum: '$balance' }
        }
      }
    ]);
    const feeCollectionSummary = feeAgg[0]
      ? {
          totalCollected: feeAgg[0].totalCollected,
          totalPending: feeAgg[0].totalPending,
          totalExpected: feeAgg[0].totalExpected
        }
      : { totalCollected: 0, totalPending: 0, totalExpected: 0 };

    // 5. Academic calendar — term start/end dates, holidays and school events
    const [upcomingTerms, systemSettings] = await Promise.all([
      Term.find({ $or: [{ startDate: { $gte: now } }, { endDate: { $gte: now } }] })
        .sort({ startDate: 1 }),
      SystemSetting.findOne().select('holidays calendarEvents').lean(),
    ]);

    const calendarItems = [];
    upcomingTerms.forEach((term) => {
      if (term.startDate && term.startDate >= now) {
        calendarItems.push({ date: term.startDate, label: `${term.name} Begins`, type: 'Term', color: 'bg-blue-600' });
      }
      if (term.endDate && term.endDate >= now) {
        calendarItems.push({ date: term.endDate, label: `${term.name} Ends`, type: 'Term', color: 'bg-emerald-600' });
      }
    });

    (systemSettings?.holidays || []).forEach((holiday) => {
      const effectiveEnd = holiday.endDate || holiday.date;
      if (effectiveEnd >= now) {
        calendarItems.push({ date: holiday.date, label: holiday.name, type: 'Holiday', color: 'bg-purple-600' });
      }
    });

    (systemSettings?.calendarEvents || []).forEach((event) => {
      const effectiveEnd = event.endDate || event.date;
      if (effectiveEnd >= now) {
        calendarItems.push({ date: event.date, label: event.title, type: 'Event', color: 'bg-cyan-600' });
      }
    });

    const academicCalendar = calendarItems
      .sort((a, b) => a.date - b.date)
      .slice(0, 8)
      .map((event) => ({
        date: event.date.toISOString(),
        displayDate: formatShortDate(event.date),
        label: event.label,
        type: event.type,
        color: event.color,
      }));

    // 6. Recent activity — the latest audited changes (who did what, to which module)
    const recentAudit = await AuditLog.find()
      .sort({ createDate: -1 })
      .limit(6)
      .populate('user_id', 'firstName lastName')
      .populate('action_no', 'action_name')
      .populate('module_no', 'module_name')
      .lean();
    const recentActivity = recentAudit.map((a) => {
      const who = a.user_id ? `${a.user_id.firstName ?? ''} ${a.user_id.lastName ?? ''}`.trim() : 'Someone';
      const action = String(a.action_no?.action_name ?? 'changed').toLowerCase().replace(/_/g, ' ');
      const module = a.module_no?.module_name ?? 'record';
      return { type: module, title: `${who} · ${action}`, desc: module, time: a.createDate };
    });

    // 7. Newest students, and how many people joined in the last 7 days
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [recentStudentDocs, newStudents, newTeachers, newParents] = await Promise.all([
      Student.find({ isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('firstName lastName admissionNumber email parentName status classId createdAt')
        .populate('classId', 'cl_name'),
      Student.countDocuments({ status: 'Active', isDeleted: { $ne: true }, createdAt: { $gte: weekAgo } }),
      Teacher.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: weekAgo } }),
      Guardian.countDocuments({ createdAt: { $gte: weekAgo } })
    ]);
    const recentStudents = recentStudentDocs.map(s => ({
      _id: s._id,
      name: `${s.firstName} ${s.lastName}`,
      admissionNumber: s.admissionNumber,
      email: s.email ?? null,
      parentName: s.parentName ?? null,
      className: s.classId?.cl_name ?? null,
      status: s.status,
      createdAt: s.createdAt
    }));

    res.status(200).json({
      success: true,
      message: "Admin dashboard KPIs fetched successfully",
      data: {
        summary: { totalStudents, totalTeachers, totalParents, totalClasses },
        newThisWeek: { students: newStudents, teachers: newTeachers, parents: newParents },
        recentStudents,
        attendanceOverview: { attendanceRate, weeklyData },
        studentDistribution,
        feeCollectionSummary: ['admin', 'principal'].includes(req.user.role) ? feeCollectionSummary : null,
        academicCalendar,
        recentActivity: ['admin', 'principal'].includes(req.user.role) ? recentActivity : []
      }
    });

  } catch (error) {
    next(error);
  }
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * @desc    Get Teacher Dashboard KPIs — scoped to the logged-in teacher's own
 *          assignments and teaching logs.
 * @route   GET /api/v1/analytics/teacher-kpis
 * @access  Private (Teacher Only)
 */
export const getTeacherDashboardKPIs = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) return next(new AppError('No teacher profile is linked to this account.', 400));

    // This term's lessons only (older terms' assignments stay for history).
    const activeTerm = await Term.findOne({ status: 'active' }).sort({ startDate: -1 }).select('_id').lean();
    const assignments = await TeacherAssignment.find({ teacherId: teacher._id, ...(activeTerm && { termId: activeTerm._id }) })
      .populate('subjectId', 'sub_name')
      .populate('classId', 'cl_name')
      .populate('timetableSlots.periodId', 'per_name time_in time_out');

    const classCount = new Set(assignments.map(a => a.classId?._id?.toString()).filter(Boolean)).size;
    const subjectCount = new Set(assignments.map(a => a.subjectId?._id?.toString()).filter(Boolean)).size;

    const todayName = DAY_NAMES[schoolTodayUTC().getUTCDay()];
    const todaySchedule = assignments
      .flatMap(a => (a.timetableSlots || [])
        .filter(slot => slot.day === todayName && slot.periodId)
        .map(slot => ({
          subject: a.subjectId?.sub_name || 'Subject',
          class: a.classId?.cl_name || 'Class',
          period: slot.periodId.per_name,
          startTime: slot.periodId.time_in,
          endTime: slot.periodId.time_out,
        })))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const [totalLogs, completedLogs, draftLogs, recentLogDocs] = await Promise.all([
      TeachingLog.countDocuments({ teacherId: teacher._id }),
      TeachingLog.countDocuments({ teacherId: teacher._id, status: 'completed' }),
      TeachingLog.countDocuments({ teacherId: teacher._id, status: 'draft' }),
      TeachingLog.find({ teacherId: teacher._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('subject classId topicTaught status date'),
    ]);

    const recentLogs = recentLogDocs.map(log => ({
      _id: log._id,
      subject: log.subject,
      classId: log.classId,
      topicTaught: log.topicTaught,
      status: log.status,
      date: log.date,
    }));

    res.status(200).json({
      success: true,
      message: 'Teacher dashboard KPIs fetched successfully',
      data: {
        summary: { classCount, subjectCount, totalLogs, completedLogs, draftLogs },
        todaySchedule,
        recentLogs,
      }
    });
  } catch (error) {
    next(error);
  }
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * @desc    Get Finance dashboard KPIs and charts data — real aggregates behind
 *          the Finance page's Dashboard tab (previously hardcoded mock data).
 * @route   GET /api/v1/analytics/finance-summary
 * @access  Private (Admin/Accountant)
 */
export const getFinanceDashboardKPIs = async (req, res, next) => {
  try {
    const now = new Date();

    // 1. Overall totals from the invoice ledger
    const totalsAgg = await StudentInvoice.aggregate([
      { $group: { _id: null, totalFees: { $sum: '$invoice_amount' }, paidFees: { $sum: '$paid_amount' }, outstanding: { $sum: '$balance' } } }
    ]);
    const totals = totalsAgg[0] || { totalFees: 0, paidFees: 0, outstanding: 0 };
    const collectionRate = totals.totalFees > 0 ? Math.round((totals.paidFees / totals.totalFees) * 1000) / 10 : 0;

    // 2. Fee status distribution (for the pie chart) — sum of invoice_amount per status
    const statusAgg = await StudentInvoice.aggregate([
      { $group: { _id: '$status', value: { $sum: '$invoice_amount' } } }
    ]);
    const statusDistribution = statusAgg.map((s) => ({ name: s._id, value: s.value }));

    // 3. Monthly collected amount for the last 6 months (StudentFee.registerDate)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyAgg = await StudentFee.aggregate([
      { $match: { registerDate: { $gte: sixMonthsAgo } } },
      { $group: { _id: { y: { $year: '$registerDate' }, m: { $month: '$registerDate' } }, collected: { $sum: '$paid_amount' } } },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ]);
    const monthlyCollection = monthlyAgg.map((row) => ({ month: MONTH_NAMES[row._id.m - 1], collected: row.collected }));

    // 4. Weekly collected amount for the last 4 weeks
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const weeklyAgg = await StudentFee.aggregate([
      { $match: { registerDate: { $gte: fourWeeksAgo } } },
      { $group: { _id: { $week: '$registerDate' }, collected: { $sum: '$paid_amount' } } },
      { $sort: { _id: 1 } }
    ]);
    const weeklyCollection = weeklyAgg.map((row, i) => ({ week: `Week ${i + 1}`, collected: row.collected }));

    // 5. Today's payments — the classic front-desk KPI, "how much money have
    // we received today". UTC-day matches what registerDate defaults to
    // (Date.now()), avoiding a locale-dependent day boundary.
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const todayAgg = await StudentFee.aggregate([
      { $match: { registerDate: { $gte: startOfToday, $lt: endOfToday } } },
      { $group: { _id: null, amount: { $sum: '$paid_amount' }, count: { $sum: 1 } } }
    ]);
    const todaysPayments = todayAgg[0]
      ? { amount: todayAgg[0].amount, count: todayAgg[0].count }
      : { amount: 0, count: 0 };

    // 6. Students with outstanding balances — one row per student (a student
    // may owe on several invoices at once), plus a top-10 preview so the
    // dashboard can show who owes the most without loading every student.
    const outstandingByStudent = await StudentInvoice.aggregate([
      { $match: { balance: { $gt: 0 } } },
      { $group: { _id: '$student', balance: { $sum: '$balance' }, invoiceCount: { $sum: 1 } } },
      { $sort: { balance: -1 } }
    ]);
    const outstandingStudentsCount = outstandingByStudent.length;

    // Resolve the top 10 to real student records for display.
    const topIds = outstandingByStudent.slice(0, 10).map((row) => row._id);
    const topStudents = await Student.find({ _id: { $in: topIds } })
      .select('firstName lastName admissionNumber classId')
      .populate('classId', 'cl_name');
    const studentById = new Map(topStudents.map((s) => [String(s._id), s]));
    const topOutstanding = outstandingByStudent.slice(0, 10)
      .map((row) => {
        const student = studentById.get(String(row._id));
        if (!student) return null; // student deleted since; skip rather than crash
        return {
          studentId: String(student._id),
          name: `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
          admissionNumber: student.admissionNumber,
          className: student.classId?.cl_name ?? '—',
          balance: row.balance,
          invoiceCount: row.invoiceCount,
        };
      })
      .filter(Boolean);

    // 7. Payment trend — daily collected amount for the last 30 days, so the
    // dashboard can render a rolling trend line rather than 4 coarse weekly
    // bars. Zero-days are filled in on the client to keep the aggregation
    // cheap and the response small.
    const thirtyDaysAgo = new Date(startOfToday.getTime() - 29 * 24 * 60 * 60 * 1000);
    const dailyAgg = await StudentFee.aggregate([
      { $match: { registerDate: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            y: { $year: '$registerDate' },
            m: { $month: '$registerDate' },
            d: { $dayOfMonth: '$registerDate' }
          },
          collected: { $sum: '$paid_amount' }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } }
    ]);
    const dailyCollection = dailyAgg.map((row) => ({
      date: `${row._id.y}-${String(row._id.m).padStart(2, '0')}-${String(row._id.d).padStart(2, '0')}`,
      collected: row.collected
    }));

    res.status(200).json({
      success: true,
      message: 'Finance dashboard KPIs fetched successfully',
      data: {
        totals: { ...totals, collectionRate },
        statusDistribution,
        monthlyCollection,
        weeklyCollection,
        todaysPayments,
        outstandingStudentsCount,
        topOutstanding,
        dailyCollection,
      }
    });
  } catch (error) {
    next(error);
  }
};
