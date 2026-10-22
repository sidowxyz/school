import express from 'express';
import {
  createTeachingLog,
  getTeachingLogs,
  getTeachingLogById,
  updateTeachingLog,
  deleteTeachingLog
} from '../controllers/teachingLogController.js';
import { validate } from '../middleware/validate.js';
import { createTeachingLogSchema, updateTeachingLogSchema } from '../validators/teachingLogValidator.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Apply auth to all routes
router.use(authenticate);

// POST   /api/teaching-logs     - Create log (teacher, admin)
router.post('/',    authorize('teacher', 'admin'), validate(createTeachingLogSchema), createTeachingLog);

// GET    /api/teaching-logs     - Get all logs (teacher, admin)
router.get('/',     authorize('teacher', 'admin'), getTeachingLogs);

// GET    /api/teaching-logs/:id - Get single log
router.get('/:id',  authorize('teacher', 'admin'), getTeachingLogById);

// PUT    /api/teaching-logs/:id - Update log (teacher, admin)
router.put('/:id',  authorize('teacher', 'admin'), validate(updateTeachingLogSchema), updateTeachingLog);

// DELETE /api/teaching-logs/:id - Delete log (owning teacher or admin)
router.delete('/:id', authorize('teacher', 'admin'), deleteTeachingLog);

export default router;
