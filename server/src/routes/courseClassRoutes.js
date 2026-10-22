import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createCourseClass,
  getAllCourseClasses,
  getCourseClassById,
  updateCourseClass,
  deleteCourseClass
} from '../controllers/courseClassController.js';
import {
  createCourseClassSchema,
  updateCourseClassSchema
} from '../validators/academicEntitiesValidator.js';

const router = express.Router();

router.post('/', authenticate, authorize('admin'), validate(createCourseClassSchema), createCourseClass);
router.get('/', authenticate, getAllCourseClasses);
router.get('/:id', authenticate, getCourseClassById);
router.put('/:id', authenticate, authorize('admin'), validate(updateCourseClassSchema), updateCourseClass);
router.delete('/:id', authenticate, authorize('admin'), deleteCourseClass);

export default router;
