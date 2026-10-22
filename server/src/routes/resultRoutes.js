import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createResult,
  getAllResults,
  getResultById,
  updateResult,
  deleteResult
} from '../controllers/resultController.js';
import {
  createResultSchema,
  updateResultSchema
} from '../validators/academicEntitiesValidator.js';

const router = express.Router();

// POST   /api/results       - Create result (admin or teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), validate(createResultSchema), createResult);

// GET    /api/results       - Get all results (authenticated)
router.get('/', authenticate, getAllResults);

// GET    /api/results/:id   - Get result by ID (authenticated)
router.get('/:id', authenticate, getResultById);

// PUT    /api/results/:id   - Update result (admin or teacher)
router.put('/:id', authenticate, authorize('admin', 'teacher'), validate(updateResultSchema), updateResult);

// DELETE /api/results/:id   - Delete result (admin only)
router.delete('/:id', authenticate, authorize('admin'), deleteResult);

export default router;
