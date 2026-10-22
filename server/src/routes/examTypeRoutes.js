import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createExamType,
  getExamTypes,
  getExamTypeById,
  updateExamType,
  deleteExamType
} from '../controllers/examTypeController.js';
import { createExamTypeSchema, updateExamTypeSchema } from '../validators/examValidator.js';

const router = express.Router();

router.post('/', authenticate, authorize('admin'), validate(createExamTypeSchema), createExamType);
router.get('/', authenticate, getExamTypes);
router.get('/:id', authenticate, getExamTypeById);
router.put('/:id', authenticate, authorize('admin'), validate(updateExamTypeSchema), updateExamType);
router.delete('/:id', authenticate, authorize('admin'), deleteExamType);

export default router;
