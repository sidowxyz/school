import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getClassResults,
  getAnalytics,
  getStudentResults
} from '../controllers/examResultController.js';

const router = express.Router();

// Published results for a whole class — staff only. Students and parents
// read their own results through /student/:studentId, which enforces linkage.
const STAFF = ['admin', 'principal', 'academic_officer', 'teacher'];

// GET /api/exam-results                    - Ranked class results
router.get('/', authenticate, authorize(...STAFF), getClassResults);

// GET /api/exam-results/analytics          - Dashboard charts
router.get('/analytics', authenticate, authorize(...STAFF), getAnalytics);

// GET /api/exam-results/student/:studentId - One student's published results
router.get(
  '/student/:studentId',
  authenticate,
  authorize('admin', 'principal', 'academic_officer', 'teacher', 'student', 'parent'),
  getStudentResults
);

export default router;
