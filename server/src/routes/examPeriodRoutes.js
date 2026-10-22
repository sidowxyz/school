import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createExamPeriod,
  getAllExamPeriods,
  getExamPeriodById,
  updateExamPeriod,
  deleteExamPeriod,
  publishExamPeriod,
  unpublishExamPeriod
} from '../controllers/examPeriodController.js';
import {
  createExamPeriodSchema,
  updateExamPeriodSchema
} from '../validators/examValidator.js';

const router = express.Router();

// Examination timetables are owned by academic staff, not by admin alone.
const ACADEMIC_STAFF = ['admin', 'principal', 'academic_officer'];

// POST   /api/exam-periods              - Create an examination period
router.post('/', authenticate, authorize(...ACADEMIC_STAFF), validate(createExamPeriodSchema), createExamPeriod);

// GET    /api/exam-periods              - List examination periods (authenticated)
router.get('/', authenticate, getAllExamPeriods);

// GET    /api/exam-periods/:id          - Get one examination period (authenticated)
router.get('/:id', authenticate, getExamPeriodById);

// PUT    /api/exam-periods/:id          - Update an examination period
router.put('/:id', authenticate, authorize(...ACADEMIC_STAFF), validate(updateExamPeriodSchema), updateExamPeriod);

// DELETE /api/exam-periods/:id          - Delete an examination period
router.delete('/:id', authenticate, authorize(...ACADEMIC_STAFF), deleteExamPeriod);

// POST   /api/exam-periods/:id/publish   - Publish the period's timetable
router.post('/:id/publish', authenticate, authorize(...ACADEMIC_STAFF), publishExamPeriod);

// POST   /api/exam-periods/:id/unpublish - Return the timetable to draft
router.post('/:id/unpublish', authenticate, authorize(...ACADEMIC_STAFF), unpublishExamPeriod);

export default router;
