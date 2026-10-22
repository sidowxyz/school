// Student portal data.
// A student reaches these via the self routes (no id in the path) and only ever
// sees their own record. Admin/staff reach the same data via the "/:studentId/*"
// routes so they can view a specific student's portal. resolveStudent() below is
// the single place that decides whose record a request is scoped to.
import Student from '../models/Student.js';
import StudentAttendance from '../models/StudentAttendance.js';
import StudentInvoice from '../models/StudentInvoice.js';
import StudentScholarship from '../models/StudentScholarship.js';
import Status from '../models/Status.js';
import Result from '../models/Result.js';
import TimetableSlot from '../models/TimetableSlot.js';
import Notification from '../models/notification.model.js';
import Message from '../models/message.model.js';
import BookIssue from '../models/BookIssue.js';
import ResultSheet from '../models/ResultSheet.js';
// Imported so their schemas are registered for the .populate() calls below —
// otherwise the queries throw MissingSchemaError for these refs.
import '../models/Period.js';
import '../models/Book.js';
import '../models/Author.js';
import '../models/Subject.js';
import '../models/Exam.js';
import '../models/ExamReg.js';
import '../models/User.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';

// Resolve which Student a request is for:
//  • admin/staff routes carry :studentId in the path → look that student up
//  • student self routes carry no id → resolve from the authenticated user
// The route layer (authorize(...)) guarantees only privileged roles can ever
// reach a request that carries :studentId, so this stays IDOR-safe.
const resolveStudent = async (req) => {
  if (req.params.studentId) {
    const student = await Student.findOne({ _id: req.params.studentId, isDeleted: false });
    if (!student) throw new AppError('Student not found', 404);
    return student;
  }
  const student = await Student.findOne({ userId: req.user._id, isDeleted: false });
  if (!student) {
    throw new AppError('No student record is linked to this account', 404);
  }
  return student;
};

// GET /api/portal/student/me  |  GET /api/portal/student/:studentId/profile
export const getMyProfile = async (req, res, next) => {
  try {
    const match = req.params.studentId
      ? { _id: req.params.studentId, isDeleted: false }
      : { userId: req.user._id, isDeleted: false };
    const student = await Student.findOne(match)
      .populate({ path: 'classId', populate: { path: 'lev_no' } })
      .populate('sectionId');
    if (!student) {
      const msg = req.params.studentId
        ? 'Student not found'
        : 'No student record is linked to this account';
      return next(new AppError(msg, 404));
    }
    res.status(200).json(new ApiResponse(200, student, 'Profile retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/student/timetable
export const getMyTimetable = async (req, res, next) => {
  try {
    const student = await resolveStudent(req);
    const slots = await TimetableSlot.find({ class: student.classId })
      .populate('subject', 'sub_name sub_no')
      .populate('teacher', 'firstName lastName email')
      .sort({ day: 1, timePeriod: 1 });
    res.status(200).json(new ApiResponse(200, slots, 'Timetable retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/student/attendance
export const getMyAttendance = async (req, res, next) => {
  try {
    const student = await resolveStudent(req);

    const records = await StudentAttendance.find({ studentId: student._id })
      .populate('periodId', 'per_no per_name time_in time_out')
      .sort({ att_date: -1 });

    // Summarize counts per status (Present / Absent / Late / Excused).
    const summary = records.reduce((acc, rec) => {
      acc[rec.status] = (acc[rec.status] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json(new ApiResponse(200, { total: records.length, summary, records }, 'Attendance retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/student/results
export const getMyResults = async (req, res, next) => {
  try {
    const student = await resolveStudent(req);
    const results = await Result.find({ id: student._id })
      .populate({ path: 'cc_no', select: 'cc_no sub_no', populate: { path: 'sub_no', select: 'sub_name sub_no' } })
      .populate({ path: 'ex_r_no', select: 'ex_r_no total_marks ex_no', populate: { path: 'ex_no', select: 'ex_name ex_no' } })
      .sort({ createDate: -1 });
    res.status(200).json(new ApiResponse(200, results, 'Results retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/student/invoices
export const getMyInvoices = async (req, res, next) => {
  try {
    const student = await resolveStudent(req);
    const invoices = await StudentInvoice.find({ student: student._id })
      .populate({ path: 'fee_struc_no', populate: { path: 'fee_type_no', select: 'fee_name' } })
      .sort({ registerDate: -1 });

    const totals = invoices.reduce((acc, inv) => {
      acc.invoiced += inv.invoice_amount;
      acc.paid += inv.paid_amount;
      acc.balance += inv.balance;
      return acc;
    }, { invoiced: 0, paid: 0, balance: 0 });

    res.status(200).json(new ApiResponse(200, { totals, invoices }, 'Invoices retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/student(/:studentId)/notifications
export const getMyNotifications = async (req, res, next) => {
  try {
    const student = await resolveStudent(req);
    if (!student.userId) {
      return res.status(200).json(new ApiResponse(200, { total: 0, unread: 0, notifications: [] }, 'Notifications retrieved'));
    }
    const notifications = await Notification.find({ user_id: student.userId }).sort({ createDate: -1 }).limit(100);
    const unread = notifications.filter((n) => !n.is_read).length;
    res.status(200).json(new ApiResponse(200, { total: notifications.length, unread, notifications }, 'Notifications retrieved'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/student(/:studentId)/messages
export const getMyMessages = async (req, res, next) => {
  try {
    const student = await resolveStudent(req);
    if (!student.userId) {
      return res.status(200).json(new ApiResponse(200, { total: 0, unread: 0, messages: [] }, 'Messages retrieved'));
    }
    const messages = await Message.find({ receiver_id: student.userId, is_deleted_by_receiver: { $ne: true } })
      .populate('sender_id', 'firstName lastName email role')
      .sort({ createDate: -1 })
      .limit(100);
    const unread = messages.filter((m) => !m.is_read).length;
    res.status(200).json(new ApiResponse(200, { total: messages.length, unread, messages }, 'Messages retrieved'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/student(/:studentId)/library
export const getMyLibrary = async (req, res, next) => {
  try {
    const student = await resolveStudent(req);
    const issues = await BookIssue.find({ student_id: student._id })
      .populate({ path: 'book_id', select: 'book_name isbn author_id', populate: { path: 'author_id', select: 'author_name name' } })
      .sort({ issue_date: -1 });

    const summary = issues.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {});
    res.status(200).json(new ApiResponse(200, { total: issues.length, summary, issues }, 'Library history retrieved'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/student(/:studentId)/scholarship
// The student's currently-active scholarship or sibling-rule discount, if any.
// Returns { active: null } rather than a 404 when there isn't one — "no
// scholarship" is a normal state, not an error.
export const getMyScholarship = async (req, res, next) => {
  try {
    const student = await resolveStudent(req);
    const activeStatus = await Status.findOne({ st_name: 'Active' });

    const grant = activeStatus
      ? await StudentScholarship.findOne({
          st_no: student._id,
          status_no: activeStatus._id,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() }
        })
          .populate({
            path: 'scholarship_id',
            select: 'discount_value description scholar_type_no discount_type_id',
            populate: [
              { path: 'scholar_type_no', select: 'scholarship_name' },
              { path: 'discount_type_id', select: 'discount_type_name' }
            ]
          })
          .populate('rule_id', 'rule_name discount_percentage')
          .sort({ startDate: -1 })
      : null;

    if (!grant) {
      return res.status(200).json(new ApiResponse(200, { active: null }, 'No active scholarship'));
    }

    const active = grant.scholarship_id
      ? {
          kind: grant.scholarship_id.scholar_type_no?.scholarship_name ?? 'Scholarship',
          basis: grant.scholarship_id.discount_type_id?.discount_type_name ?? null,
          value: grant.scholarship_id.discount_value ?? null,
          startDate: grant.startDate,
          endDate: grant.endDate
        }
      : {
          kind: 'Sibling Rule',
          basis: grant.rule_id?.rule_name ?? null,
          value: grant.rule_id?.discount_percentage ?? null,
          startDate: grant.startDate,
          endDate: grant.endDate
        };

    res.status(200).json(new ApiResponse(200, { active }, 'Scholarship retrieved'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/student(/:studentId)/report-cards
export const getMyReportCards = async (req, res, next) => {
  try {
    const student = await resolveStudent(req);
    const sheets = await ResultSheet.find({ student: student._id })
      .populate({ path: 'examReg', select: 'ex_r_no total_marks ex_no', populate: { path: 'ex_no', select: 'ex_name ex_no' } })
      .populate('marks.subject', 'sub_name sub_no')
      .sort({ createdAt: -1 });
    res.status(200).json(new ApiResponse(200, sheets, 'Report cards retrieved'));
  } catch (error) {
    next(error);
  }
};
