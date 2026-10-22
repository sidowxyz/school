import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createResultSheet,
  getAllResultSheets,
  getResultSheetById,
  updateResultSheet,
  deleteResultSheet
} from '../controllers/resultSheetController.js';
import {
  createResultSheetSchema,
  updateResultSheetSchema
} from '../validators/resultSheetValidator.js';

const router = express.Router();

// Uploading/editing result sheets is staff-only; viewing stays open to any
// authenticated user (students/parents need to read their own results).
const canManageResults = authorize('admin', 'principal', 'academic_officer', 'teacher');

router.post('/', authenticate, canManageResults, validate(createResultSheetSchema), createResultSheet);
router.get('/', authenticate, getAllResultSheets);
router.get('/:id', authenticate, getResultSheetById);
router.put('/:id', authenticate, canManageResults, validate(updateResultSheetSchema), updateResultSheet);
router.delete('/:id', authenticate, canManageResults, deleteResultSheet);

export default router;
