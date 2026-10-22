import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Class from '../models/Class.js';
import StudentAttendance from '../models/StudentAttendance.js';
import User from '../models/User.js';
import StudentInvoice from '../models/StudentInvoice.js';
import StudentFee from '../models/StudentFee.js';
import Exam from '../models/Exam.js';
import Term from '../models/Term.js';
import SystemSetting from '../models/SystemSetting.js';
import Notification from '../models/notification.model.js';
import Notice from '../models/notice.model.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import TeachingLog from '../models/TeachingLog.js';
import ResultSheet from '../models/ResultSheet.js';
import AppError from '../utils/AppError.js';

const formatShortDate = (date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatLongDate = (date) =>
  date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/**
 * @desc    Get Admin Dashboard KPIs and Charts Data
 * @route   GET /api/v1/analytics/admin-kpis
 * @access  Private (Admin Only)
 */
export const getAdminDashboardKPIs = async (req, res, next) => {
  try {
    const now = new Date();

    // 1. Top summary cards
    const [totalStudents, totalTeachers, totalClasses, totalParents] = await Promise.all([
      Student.countDocuments({ status: 'Active' }),
      Teacher.countDocuments(),
      Class.countDocuments(),
      User.countDocuments({ role: 'parent' })
    ]);

    // 2. Student distribution by class
    // Student has no `grade` field — grade level is expressed via classId → Class.cl_name.
    const distributionData = await Student.aggregate([
      { $match: { status: 'Active' } },
      { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'cls' } },
      { $unwind: { path: '$cls', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$cls.cl_name', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const studentDistribution = distributionData.map(item => ({
      name: item._id || 'Unknown',
      value: item.count
    }));

    // 3. Weekly attendance overview (Mon - Fri, current week)
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    // StudentAttendance.status is a plain string enum ('Present' | 'Absent' | 'Late' | 'Excused'),
    // read directly off the doc — no lookup needed.
    const attendanceRaw = await StudentAttendance.aggregate([
      { $match: { att_date: { $gte: startOfWeek } } },
      {
        $group: {
          _id: { dayOfWeek: { $dayOfWeek: '$att_date' }, statusName: { $toLower: '$status' } },
          count: { $sum: 1 }
        }
      }
    ]);

    const daysMap = { 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri' };
    const attendanceFormatted = {
      Mon: { day: 'Mon', present: 0, absent: 0 },
      Tue: { day: 'Tue', present: 0, absent: 0 },
      Wed: { day: 'Wed', present: 0, absent: 0 },
      Thu: { day: 'Thu', present: 0, absent: 0 },
      Fri: { day: 'Fri', present: 0, absent: 0 }
    };

    attendanceRaw.forEach(item => {
      const dayName = daysMap[item._id.dayOfWeek];
      if (!dayName) return;
      if (item._id.statusName === 'present') attendanceFormatted[dayName].present = item.count;
      else if (item._id.statusName === 'absent') attendanceFormatted[dayName].absent = item.count;
    });

    const weeklyData = Object.values(attendanceFormatted);
    const totalPresent = weeklyData.reduce((sum, d) => sum + d.present, 0);
    const totalAbsent = weeklyData.reduce((sum, d) => sum + d.absent, 0);
    const attendanceRate = totalPresent + totalAbsent > 0
      ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 1000) / 10
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

    // 5. Upcoming exams use the real records managed by Examination.
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const upcomingExamDocs = await Exam.find({
      exam_date: { $gte: startOfToday },
      status: { $ne: 'completed' },
    })
      .sort({ exam_date: 1, start_time: 1 })
      .limit(50)
      .populate('class_id', 'cl_name')
      .populate('subject_id', 'sub_name');

    const groupedUpcomingExams = new Map();
    upcomingExamDocs
      .filter((exam) => {
        const examStartsAt = new Date(exam.exam_date);
        const [hours = 0, minutes = 0] = (exam.start_time || '00:00').split(':').map(Number);
        examStartsAt.setHours(hours, minutes, 0, 0);
        return examStartsAt >= now;
      })
      .forEach((exam) => {
        const key = exam.batch_id || exam._id.toString();
        const existing = groupedUpcomingExams.get(key);
        const grade = exam.class_id?.cl_name;
        if (existing) {
          if (grade && !existing.grades.includes(grade)) existing.grades.push(grade);
          return;
        }
        groupedUpcomingExams.set(key, {
          id: exam._id,
          title: exam.ex_name,
          grades: grade ? [grade] : [],
          subject: exam.subject_id?.sub_name || null,
          date: formatLongDate(exam.exam_date),
          time: `${exam.start_time} - ${exam.end_time}`,
          status: 'scheduled',
        });
      });

    const upcomingExams = Array.from(groupedUpcomingExams.values())
      .slice(0, 5)
      .map((exam) => ({
        id: exam.id,
        title: exam.title,
        grade: exam.grades.join(', ') || 'Grade not assigned',
        subject: exam.subject,
        date: exam.date,
        time: exam.time,
        status: exam.status,
      }));

    // 6. Academic calendar — merges upcoming exam start dates with term start/end dates
    const [upcomingTerms, calendarExams, systemSettings] = await Promise.all([
      Term.find({ $or: [{ startDate: { $gte: now } }, { endDate: { $gte: now } }] })
        .sort({ startDate: 1 }),
      Exam.find({ exam_date: { $gte: now } })
        .select('ex_name exam_date batch_id')
        .sort({ exam_date: 1 }),
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

    const seenExams = new Set();
    calendarExams.forEach((exam) => {
      const dateKey = exam.exam_date.toISOString().slice(0, 10);
      const key = `${exam.batch_id || exam.ex_name}-${dateKey}`;
      if (seenExams.has(key)) return;
      seenExams.add(key);
      calendarItems.push({ date: exam.exam_date, label: exam.ex_name, type: 'Exam', color: 'bg-orange-500' });
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

    // 7. Recent notifications for the logged-in admin
    const recentNotificationCandidates = await Notification.find({ user_id: req.user._id })
      .sort({ createDate: -1 })
      .limit(25)
      .select('type title body createDate reference_id reference_model');

    const noticeReferenceIds = recentNotificationCandidates
      .filter((notification) => notification.reference_model === 'Notice' && notification.reference_id)
      .map((notification) => notification.reference_id);
    const existingNoticeIds = new Set(
      (await Notice.find({ _id: { $in: noticeReferenceIds } }).distinct('_id'))
        .map((id) => id.toString())
    );
    const recentNotificationDocs = recentNotificationCandidates
      .filter((notification) =>
        notification.reference_model !== 'Notice' ||
        (notification.reference_id && existingNoticeIds.has(notification.reference_id.toString()))
      )
      .slice(0, 5);

    const recentNotifications = recentNotificationDocs.map(n => ({
      type: n.type,
      title: n.title,
      desc: n.body,
      time: n.createDate
    }));

    res.status(200).json({
      success: true,
      message: "Admin dashboard KPIs fetched successfully",
      data: {
        summary: { totalStudents, totalTeachers, totalParents, totalClasses },
        attendanceOverview: { attendanceRate, weeklyData },
        studentDistribution,
        feeCollectionSummary,
        upcomingExams,
        academicCalendar,
        recentNotifications
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Academic performance aggregates — average score per class and per
 *          subject, plus overall pass rate — computed from published result sheets.
 * @route   GET /api/v1/analytics/academic-performance
 * @access  Private (Admin / Principal / Academic Officer)
 */
export const getAcademicPerformance = async (req, res, next) => {
  try {
    // Average overall score per class: ResultSheet.class → CourseClass.cl_no → Class.
    const byClassRaw = await ResultSheet.aggregate([
      { $match: { overallScore: { $ne: null } } },
      { $lookup: { from: 'courseclasses', localField: 'class', foreignField: '_id', as: 'cc' } },
      { $unwind: '$cc' },
      { $lookup: { from: 'classes', localField: 'cc.cl_no', foreignField: '_id', as: 'cls' } },
      { $unwind: '$cls' },
      { $group: { _id: '$cls.cl_name', avgScore: { $avg: '$overallScore' } } },
      { $sort: { _id: 1 } },
    ]);
    const byClass = byClassRaw.map((r) => ({ class: r._id || 'Unknown', score: Math.round(r.avgScore || 0) }));

    // Average score per subject: unwind ResultSheet.marks → Subject.
    const bySubjectRaw = await ResultSheet.aggregate([
      { $unwind: '$marks' },
      { $group: { _id: '$marks.subject', avgScore: { $avg: '$marks.score' } } },
      { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'sub' } },
      { $unwind: '$sub' },
      { $project: { subject: '$sub.sub_name', avgScore: 1 } },
      { $sort: { subject: 1 } },
    ]);
    const bySubject = bySubjectRaw.map((r) => ({ subject: r.subject || 'Unknown', score: Math.round(r.avgScore || 0) }));

    // Overall pass rate (overallScore >= 50).
    const [total, passed] = await Promise.all([
      ResultSheet.countDocuments({ overallScore: { $ne: null } }),
      ResultSheet.countDocuments({ overallScore: { $gte: 50 } }),
    ]);
    const passRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;

    res.status(200).json({
      success: true,
      message: 'Academic performance fetched successfully',
      data: { passRate, byClass, bySubject },
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

    const assignments = await TeacherAssignment.find({ teacherId: teacher._id })
      .populate('subjectId', 'sub_name')
      .populate('classId', 'cl_name')
      .populate('timetableSlots.periodId', 'per_name time_in time_out');

    const classCount = new Set(assignments.map(a => a.classId?._id?.toString()).filter(Boolean)).size;
    const subjectCount = new Set(assignments.map(a => a.subjectId?._id?.toString()).filter(Boolean)).size;

    const todayName = DAY_NAMES[new Date().getDay()];
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
