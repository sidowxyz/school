import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getMyProfile,
  getMyTimetable,
  getMyAttendance,
  getMyResults,
  getMyInvoices,
  getMyScholarship,
  getMyNotifications,
  getMyMessages,
  getMyLibrary,
  getMyReportCards
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
router.get('/results',       self, getMyResults);
router.get('/invoices',      self, getMyInvoices);
router.get('/scholarship',   self, getMyScholarship);
router.get('/notifications', self, getMyNotifications);
router.get('/messages',      self, getMyMessages);
router.get('/library',       self, getMyLibrary);
router.get('/report-cards',  self, getMyReportCards);

// Admin/staff viewing a specific student's portal
// The :studentId in the path is honoured only for these privileged roles.
const staff = authorize('admin', 'principal', 'academic_officer');
router.get('/:studentId/profile',       staff, getMyProfile);
router.get('/:studentId/timetable',     staff, getMyTimetable);
router.get('/:studentId/attendance',    staff, getMyAttendance);
router.get('/:studentId/results',       staff, getMyResults);
router.get('/:studentId/invoices',      staff, getMyInvoices);
router.get('/:studentId/scholarship',   staff, getMyScholarship);
router.get('/:studentId/notifications', staff, getMyNotifications);
router.get('/:studentId/messages',      staff, getMyMessages);
router.get('/:studentId/library',       staff, getMyLibrary);
router.get('/:studentId/report-cards',  staff, getMyReportCards);

export default router;
