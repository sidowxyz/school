import express from 'express';
import { getAssignments } from '../controllers/assignmentController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

// Read-only master timetable feed — any authenticated staff member can view the
// published schedule. Creating/editing assignments still goes through the
// admin-only /api/teachers/:id/assignments endpoints.
router.get('/', authenticate, getAssignments);

export default router;
