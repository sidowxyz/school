import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createExam,
  createBulkExams,
  getAllExams,
  getTimetable,
  getExamById,
  updateExam,
  updateBulkExams,
  deleteExam,
  deleteBulkExams
} from '../controllers/examController.js';
import {
  createExamSchema,
  updateExamSchema,
  createBulkExamSchema,
  updateBulkExamSchema
} from '../validators/examValidator.js';

const router = express.Router();

// Scheduling examinations is academic staff work, not admin-only.
const ACADEMIC_STAFF = ['admin', 'principal', 'academic_officer'];

// POST   /api/exams           - Create a new exam
router.post('/', authenticate, authorize(...ACADEMIC_STAFF), validate(createExamSchema), createExam);

// POST   /api/exams/bulk      - Create one exam per selected class/grade
router.post('/bulk', authenticate, authorize(...ACADEMIC_STAFF), validate(createBulkExamSchema), createBulkExams);

// PUT    /api/exams/batch/:batchId - Update every exam sharing a batch_id
router.put('/batch/:batchId', authenticate, authorize(...ACADEMIC_STAFF), validate(updateBulkExamSchema), updateBulkExams);

// DELETE /api/exams/batch/:batchId - Delete every exam sharing a batch_id
router.delete('/batch/:batchId', authenticate, authorize(...ACADEMIC_STAFF), deleteBulkExams);

// GET    /api/exams           - Get all exams (authenticated)
router.get('/', authenticate, getAllExams);

// GET    /api/exams/timetable - Timetable rows + clash ids (authenticated).
// Declared before /:id so "timetable" isn't read as an exam id.
router.get('/timetable', authenticate, getTimetable);

// GET    /api/exams/:id       - Get exam by ID (authenticated)
router.get('/:id', authenticate, getExamById);

// PUT    /api/exams/:id       - Update exam
router.put('/:id', authenticate, authorize(...ACADEMIC_STAFF), validate(updateExamSchema), updateExam);

// DELETE /api/exams/:id       - Delete exam
router.delete('/:id', authenticate, authorize(...ACADEMIC_STAFF), deleteExam);

export default router;
