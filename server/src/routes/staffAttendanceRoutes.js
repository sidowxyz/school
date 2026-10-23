import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  recordAttendance,
  getAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getMonthlyReport,
  getSummary
} from '../controllers/staffAttendanceController.js';
import {
  recordStaffAttendanceSchema,
  updateStaffAttendanceSchema
} from '../validators/staffAttendanceValidator.js';

const router = express.Router();

// Staff/teacher attendance management is restricted to admin, principal
// and academic officer roles.
router.use(authenticate);
router.use(authorize('admin', 'principal', 'academic_officer'));

router.post('/', validate(recordStaffAttendanceSchema), recordAttendance);
router.get('/', getAttendance);
router.get('/report', getMonthlyReport);
// Overview figures for the staff attendance page (before /:id so it isn't read as an id).
router.get('/summary', getSummary);
router.get('/:id', getAttendanceById);
router.put('/:id', validate(updateStaffAttendanceSchema), updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;
