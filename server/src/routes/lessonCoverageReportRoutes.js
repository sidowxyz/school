import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { getLessonCoverageReport } from '../controllers/lessonCoverageReportController.js';

const router = express.Router();

const canViewCoverageReports = authorize('admin', 'principal', 'academic_officer', 'teacher');

router.get('/class/:classId', authenticate, canViewCoverageReports, getLessonCoverageReport);
router.get('/report/:classId', authenticate, canViewCoverageReports, getLessonCoverageReport);

export default router;
