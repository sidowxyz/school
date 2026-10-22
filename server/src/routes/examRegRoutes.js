import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createExamReg,
  getAllExamRegs,
  getExamRegById,
  updateExamReg,
  deleteExamReg
} from '../controllers/examRegController.js';
import {
  createExamRegSchema,
  updateExamRegSchema
} from '../validators/academicEntitiesValidator.js';

const router = express.Router();

// POST   /api/exam-reg      - Create exam registration (admin only)
router.post('/', authenticate, authorize('admin'), validate(createExamRegSchema), createExamReg);

// GET    /api/exam-reg      - Get all exam registrations (authenticated)
router.get('/', authenticate, getAllExamRegs);

// GET    /api/exam-reg/:id  - Get exam registration by ID (authenticated)
router.get('/:id', authenticate, getExamRegById);

// PUT    /api/exam-reg/:id  - Update exam registration (admin only)
router.put('/:id', authenticate, authorize('admin'), validate(updateExamRegSchema), updateExamReg);

// DELETE /api/exam-reg/:id  - Delete exam registration (admin only)
router.delete('/:id', authenticate, authorize('admin'), deleteExamReg);

export default router;
