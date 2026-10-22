import express from 'express';
import { listAssignments } from '../controllers/teacherController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// GET /api/teacher-assignments — list every assignment, teacher name attached.
router.get('/', authenticate, authorize('admin', 'teacher', 'principal', 'academic_officer'), listAssignments);

export default router;
