import express from 'express';
import { 
  markAttendance, 
  getAttendance, 
  getMonthlyReport,
  getAttendanceStatuses,
  getPeriods,
  getEnrolledStudents,
  getAttendanceSummary
} from '../controllers/attendanceController.js';
import { validate } from '../middleware/validate.js';
import { markAttendanceSchema } from '../validators/attendanceValidator.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Writing attendance is staff-only — without this a student could mark themselves present.
router.post(
  '/',
  authenticate,
  authorize('admin', 'principal', 'academic_officer', 'teacher'),
  validate(markAttendanceSchema),
  markAttendance
);

router.get('/statuses', authenticate, getAttendanceStatuses);
router.get('/periods', authenticate, getPeriods);
router.get('/enrolled-students', authenticate, getEnrolledStudents);

router.get('/', authenticate, getAttendance);
router.get('/report', authenticate, getMonthlyReport);
// Overview figures for the attendance page (staff only; teachers see their own classes).
router.get('/summary', authenticate, authorize('admin', 'principal', 'academic_officer', 'teacher'), getAttendanceSummary);

export default router;
