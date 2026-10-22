import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} from '../controllers/staffController.js';
import {
  createStaffSchema,
  updateStaffSchema
} from '../validators/academicEntitiesValidator.js';

const router = express.Router();

router.post('/', authenticate, authorize('admin'), validate(createStaffSchema), createStaff);
router.get('/', authenticate, getAllStaff);
router.get('/:id', authenticate, getStaffById);
router.put('/:id', authenticate, authorize('admin'), validate(updateStaffSchema), updateStaff);
router.delete('/:id', authenticate, authorize('admin'), deleteStaff);

export default router;
