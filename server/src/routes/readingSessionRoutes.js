import express from 'express';
import {
  createReadingSession,
  getReadingSessions,
  getReadingSessionById,
  updateReadingSession,
  deleteReadingSession,
  getStudentReadingStats
} from '../controllers/readingSessionController.js';
import { validate } from '../middleware/validate.js';
import {
  createReadingSessionSchema,
  updateReadingSessionSchema
} from '../validators/libraryValidator.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

const canManageLibrary = authorize('admin', 'librarian');

// GET  /api/library/reading-sessions?st_id=&book_id=&status=&page=&limit=
router.get('/reading-sessions', authenticate, getReadingSessions);

// GET  /api/library/reading-sessions/student/:studentId  (stats + history)
router.get('/reading-sessions/student/:studentId', authenticate, getStudentReadingStats);

// GET  /api/library/reading-sessions/:id
router.get('/reading-sessions/:id', authenticate, getReadingSessionById);

// POST /api/library/reading-sessions
router.post(
  '/reading-sessions',
  authenticate,
  canManageLibrary,
  validate(createReadingSessionSchema),
  createReadingSession
);

// PUT  /api/library/reading-sessions/:id
router.put(
  '/reading-sessions/:id',
  authenticate,
  canManageLibrary,
  validate(updateReadingSessionSchema),
  updateReadingSession
);

// DELETE /api/library/reading-sessions/:id
router.delete('/reading-sessions/:id', authenticate, canManageLibrary, deleteReadingSession);

export default router;
