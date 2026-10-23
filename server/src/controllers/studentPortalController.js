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
import TeacherAssignment from '../models/TeacherAssignment.js';
import Term from '../models/Term.js';
// Imported so their schemas are registered for the .populate() calls below —
// otherwise the queries throw MissingSchemaError for these refs.
import '../models/Period.js';
import '../models/Subject.js';
import '../models/User.js';
import '../models/Teacher.js';
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
// The week is built from the same teacher assignments the admin Timetable page
// edits, for the student's class and section in the current term, so a lesson
// placed there shows up here straight away.
export const getMyTimetable = async (req, res, next) => {
  try {
    const student = await resolveStudent(req);
    const term = await Term.findOne({ status: 'active' }).sort({ startDate: -1, createdAt: -1 }).select('_id').lean()
      ?? await Term.findOne().sort({ startDate: -1, createdAt: -1 }).select('_id').lean();
    if (!term || !student.classId) {
      return res.status(200).json(new ApiResponse(200, [], 'Timetable retrieved successfully'));
    }

    const filter = { classId: student.classId, termId: term._id };
    if (student.sectionId) filter.sectionId = student.sectionId;
    const assignments = await TeacherAssignment.find(filter)
      .populate('subjectId', 'sub_name sub_no')
      .populate({ path: 'teacherId', select: 'userId', populate: { path: 'userId', select: 'firstName lastName email' } })
      .populate('timetableSlots.periodId', 'per_name time_in time_out')
      .lean();

    const slots = [];
    for (const a of assignments) {
      const user = a.teacherId?.userId;
      for (const slot of a.timetableSlots ?? []) {
        const p = slot.periodId;
        if (!p) continue;
        slots.push({
          _id: `${a._id}-${slot._id}`,
          day: slot.day,
          timePeriod: p.time_in && p.time_out ? `${p.time_in} - ${p.time_out}` : (p.per_name ?? ''),
          subject: a.subjectId ?? null,
          teacher: user ? { _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email } : null,
        });
      }
    }
    slots.sort((x, y) => x.day.localeCompare(y.day) || x.timePeriod.localeCompare(y.timePeriod));
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
