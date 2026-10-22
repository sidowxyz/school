import express from 'express';
import { createStudentMark, createBulkMarks, getStudentResults } from '../controllers/markController.js';
import { auditLogger } from '../middleware/auditLogger.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// 1. Jidka Gelinta Dhibcaha (Single Entry) - Admin ama Macallinka
router.post('/', authenticate, authorize('admin', 'teacher'), auditLogger('Mark', 'CREATE'), createStudentMark);

// 2. Jidka Gelinta Dhibcaha Badan (Bulk Entry) - Admin ama Macallinka
router.post('/bulk', authenticate, authorize('admin', 'teacher'), auditLogger('Mark', 'CREATE'), createBulkMarks);

// 3. Jidka Akhrisashada Natiijada - Admin, Teacher, iyo Student
router.get('/student/:studentId', authenticate, authorize('admin', 'teacher', 'student'), getStudentResults);

export default router;