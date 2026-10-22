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

const router = express.Router();

// All settings actions require login
router.use(authenticate);

router.get('/academic-calendar', getAcademicCalendar);
router.post('/logo', authorize('admin', 'principal'), uploadPhotoMiddleware, uploadSchoolLogo);

router.post('/holidays', authorize('admin', 'principal'), validate(holidaySettingSchema), createHoliday);
router.put('/holidays/:holidayId', authorize('admin', 'principal'), validate(holidaySettingSchema), updateHoliday);
router.delete('/holidays/:holidayId', authorize('admin', 'principal'), deleteHoliday);

router.post('/calendar-events', authorize('admin', 'principal'), validate(calendarEventSettingSchema), createCalendarEvent);
router.put('/calendar-events/:eventId', authorize('admin', 'principal'), validate(calendarEventSettingSchema), updateCalendarEvent);
router.delete('/calendar-events/:eventId', authorize('admin', 'principal'), deleteCalendarEvent);

router.route('/')
  .get(getSystemSettings)
  .put(authorize('admin', 'principal'), validate(updateSystemSettingSchema), updateSystemSettings);

export default router;
