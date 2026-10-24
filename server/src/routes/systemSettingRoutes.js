import express from 'express';
import {
  createCalendarEvent,
  createHoliday,
  deleteCalendarEvent,
  deleteHoliday,
  getAcademicCalendar,
  getSystemSettings,
  updateCalendarEvent,
  updateHoliday,
  updateSystemSettings,
  getPublicIdentity,
  uploadSchoolLogo,
} from '../controllers/systemSettingController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  calendarEventSettingSchema,
  holidaySettingSchema,
  updateSystemSettingSchema,
} from '../validators/systemSettingValidator.js';
import { uploadPhotoMiddleware } from '../middleware/upload.js';
import { auditLogger } from '../middleware/auditLogger.js';

const router = express.Router();

// Name, logo and contact details only: shown on the sign-in page, before login.
router.get('/public', getPublicIdentity);

// All other settings actions require login
router.use(authenticate);

router.get('/academic-calendar', getAcademicCalendar);
router.post('/logo', authorize('admin', 'principal'), uploadPhotoMiddleware, auditLogger('SystemSetting', 'UPDATE'), uploadSchoolLogo);

router.post('/holidays', authorize('admin', 'principal', 'academic_officer'), validate(holidaySettingSchema), createHoliday);
router.put('/holidays/:holidayId', authorize('admin', 'principal', 'academic_officer'), validate(holidaySettingSchema), updateHoliday);
router.delete('/holidays/:holidayId', authorize('admin', 'principal', 'academic_officer'), deleteHoliday);

router.post('/calendar-events', authorize('admin', 'principal', 'academic_officer'), validate(calendarEventSettingSchema), createCalendarEvent);
router.put('/calendar-events/:eventId', authorize('admin', 'principal', 'academic_officer'), validate(calendarEventSettingSchema), updateCalendarEvent);
router.delete('/calendar-events/:eventId', authorize('admin', 'principal', 'academic_officer'), deleteCalendarEvent);

router.route('/')
  .get(getSystemSettings)
  .put(authorize('admin', 'principal'), validate(updateSystemSettingSchema), auditLogger('SystemSetting', 'UPDATE'), updateSystemSettings);

export default router;
