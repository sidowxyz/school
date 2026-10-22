import express from 'express';
import {
  createTeacher,
  getTeachers,
  getTeacher,
  updateTeacher,
  deleteTeacher,
  addAssignment,
  updateAssignment,
  removeAssignment,
  getTimetable
} from '../controllers/teacherController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { auditLogger } from '../middleware/auditLogger.js';

const router = express.Router();

// POST   /api/teachers          - Create teacher (admin only)
router.post('/',   authenticate, authorize('admin'), auditLogger('Teacher', 'CREATE'), createTeacher);

// GET    /api/teachers          - Get all teachers (authenticated)
router.get('/',    authenticate, getTeachers);

// GET    /api/teachers/:id      - Get single teacher
router.get('/:id', authenticate, getTeacher);

// PUT    /api/teachers/:id      - Update teacher (admin only)
router.put('/:id', authenticate, authorize('admin'), auditLogger('Teacher', 'UPDATE'), updateTeacher);

// DELETE /api/teachers/:id      - Delete teacher (admin only)
router.delete('/:id', authenticate, authorize('admin'), auditLogger('Teacher', 'DELETE'), deleteTeacher);

// POST   /api/teachers/:id/assignments         - Add assignment
router.post('/:id/assignments', authenticate, authorize('admin'), auditLogger('Teacher', 'UPDATE'), addAssignment);

// PUT    /api/teachers/:id/assignments/:assignmentId - Edit assignment
router.put('/:id/assignments/:assignmentId', authenticate, authorize('admin'), auditLogger('Teacher', 'UPDATE'), updateAssignment);

// DELETE /api/teachers/:id/assignments/:assignmentId - Remove assignment
router.delete('/:id/assignments/:assignmentId', authenticate, authorize('admin'), auditLogger('Teacher', 'UPDATE'), removeAssignment);

// GET    /api/teachers/:id/timetable           - Get teacher timetable
router.get('/:id/timetable', authenticate, getTimetable);

export default router;