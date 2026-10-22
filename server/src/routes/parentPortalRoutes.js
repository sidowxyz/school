import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getMyChildren,
  getChildProfile,
  getChildAttendance,
  getChildInvoices,
  getChildResults,
  getGuardianNotices,
  getGuardianMessages
} from '../controllers/parentPortalController.js';

const router = express.Router();

// Every portal route requires a login.
router.use(authenticate);

// Parent self-service
// No guardian id in the path; each handler scopes to the caller's own linked
// children, so a parent can only ever read their own family's data.
const self = authorize('parent');
router.get('/children',                       self, getMyChildren);
router.get('/children/:studentId/profile',    self, getChildProfile);
router.get('/children/:studentId/attendance', self, getChildAttendance);
router.get('/children/:studentId/invoices',   self, getChildInvoices);
router.get('/children/:studentId/results',    self, getChildResults);
router.get('/notices',                        self, getGuardianNotices);
router.get('/messages',                       self, getGuardianMessages);

// Admin/staff viewing a specific parent's portal
// The :guardianId in the path is honoured only for these privileged roles.
// Child linkage is still verified against that guardian, so cross-family reads
// remain impossible.
const staff = authorize('admin', 'principal', 'academic_officer');
router.get('/:guardianId/children',                       staff, getMyChildren);
router.get('/:guardianId/children/:studentId/profile',    staff, getChildProfile);
router.get('/:guardianId/children/:studentId/attendance', staff, getChildAttendance);
router.get('/:guardianId/children/:studentId/invoices',   staff, getChildInvoices);
router.get('/:guardianId/children/:studentId/results',    staff, getChildResults);
router.get('/:guardianId/notices',                        staff, getGuardianNotices);
router.get('/:guardianId/messages',                       staff, getGuardianMessages);

export default router;
