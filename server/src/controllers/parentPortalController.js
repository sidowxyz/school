// Parent / guardian portal.
// The guardian is resolved from the authenticated user (Guardian.userId ===
// req.user._id). Every child-scoped endpoint verifies the requested student is
// actually linked to this guardian before returning anything, so a guardian
// cannot read another family's child by guessing an id (IDOR blocked).
import Guardian from '../models/Guardian.js';
import Student from '../models/Student.js';
import StudentAttendance from '../models/StudentAttendance.js';
import StudentInvoice from '../models/StudentInvoice.js';
// Imported so their schemas are registered for the .populate() calls below —
// otherwise the queries throw MissingSchemaError for these refs.
import '../models/Period.js';
import '../models/Subject.js';
import '../models/User.js';
import AppError from '../utils/AppError.js';
import ApiResponse from '../utils/ApiResponse.js';

// Resolve the Guardian document linked to the logged-in user.
const getMyGuardian = async (userId) => {
  const guardian = await Guardian.findOne({ userId });
  if (!guardian) {
    throw new AppError('No guardian record is linked to this account', 404);
  }
  return guardian;
};

// Resolve which Guardian a request is for:
//  • admin/staff routes carry :guardianId in the path → look that guardian up
//  • parent self routes carry no id → resolve from the authenticated user
// The route layer (authorize(...)) guarantees only privileged roles reach a
// request carrying :guardianId. Child linkage is still verified per request, so
// this stays IDOR-safe for both.
const resolveGuardian = async (req) => {
  if (req.params.guardianId) {
    const guardian = await Guardian.findById(req.params.guardianId);
    if (!guardian) throw new AppError('Guardian not found', 404);
    return guardian;
  }
  return getMyGuardian(req.user._id);
};

// Return the student only if it is linked to this guardian, else 403.
const getLinkedChild = async (guardianId, studentId) => {
  const student = await Student.findOne({
    _id: studentId,
    isDeleted: false,
    'guardians.guardianId': guardianId
  });
  if (!student) {
    throw new AppError('You are not authorized to view this student', 403);
  }
  return student;
};

// GET /api/portal/parent/children
export const getMyChildren = async (req, res, next) => {
  try {
    const guardian = await resolveGuardian(req);
    const children = await Student.find({
      isDeleted: false,
      'guardians.guardianId': guardian._id
    })
      .populate({ path: 'classId', populate: { path: 'lev_no' } })
      .populate('sectionId');
    res.status(200).json(new ApiResponse(200, children, 'Linked students retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/parent/children/:studentId/profile
export const getChildProfile = async (req, res, next) => {
  try {
    const guardian = await resolveGuardian(req);
    await getLinkedChild(guardian._id, req.params.studentId);
    const student = await Student.findById(req.params.studentId)
      .populate({ path: 'classId', populate: { path: 'lev_no' } })
      .populate('sectionId');
    res.status(200).json(new ApiResponse(200, student, 'Student profile retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/parent/children/:studentId/attendance
export const getChildAttendance = async (req, res, next) => {
  try {
    const guardian = await resolveGuardian(req);
    const child = await getLinkedChild(guardian._id, req.params.studentId);

    const records = await StudentAttendance.find({ studentId: child._id })
      .populate('periodId', 'per_no per_name time_in time_out')
      .sort({ att_date: -1 });

    const summary = records.reduce((acc, rec) => {
      acc[rec.status] = (acc[rec.status] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json(new ApiResponse(200, { total: records.length, summary, records }, 'Attendance retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

// GET /api/portal/parent/children/:studentId/invoices
export const getChildInvoices = async (req, res, next) => {
  try {
    const guardian = await resolveGuardian(req);
    const child = await getLinkedChild(guardian._id, req.params.studentId);
    const invoices = await StudentInvoice.find({ student: child._id })
      .populate('fee_struc_no')
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
