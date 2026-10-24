import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getMyProfile,
  getMyTimetable,
  getMyAttendance,
  getMyInvoices,
  getMyScholarship,
  getMyResults
} from '../controllers/studentPortalController.js';

const router = express.Router();

// Every portal route requires a login.
router.use(authenticate);

// Student self-service
// No id in the path; each handler scopes to the caller's own record, so a
// student can only ever read their own data (IDOR-safe by design).
const self = authorize('student');
router.get('/me',            self, getMyProfile);
router.get('/timetable',     self, getMyTimetable);
router.get('/attendance',    self, getMyAttendance);
router.get('/invoices',      self, getMyInvoices);
router.get('/scholarship',   self, getMyScholarship);
router.get('/results',       self, getMyResults);

// Admin/staff viewing a specific student's portal
// The :studentId in the path is honoured only for these privileged roles.
const staff = authorize('admin', 'principal', 'academic_officer');
router.get('/:studentId/profile',       staff, getMyProfile);
router.get('/:studentId/timetable',     staff, getMyTimetable);
router.get('/:studentId/attendance',    staff, getMyAttendance);
router.get('/:studentId/invoices',      staff, getMyInvoices);
router.get('/:studentId/scholarship',   staff, getMyScholarship);
router.get('/:studentId/results',       staff, getMyResults);

export default router;
