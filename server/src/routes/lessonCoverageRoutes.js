import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createLessonCoverage,
  getAllLessonCoverages,
  getLessonCoverageById,
  updateLessonCoverage,
  deleteLessonCoverage
} from '../controllers/lessonCoverageController.js';
import {
  createLessonCoverageSchema,
  updateLessonCoverageSchema
} from '../validators/academicEntitiesValidator.js';

const router = express.Router();

router.post('/', authenticate, authorize('admin', 'teacher'), validate(createLessonCoverageSchema), createLessonCoverage);
router.get('/', authenticate, getAllLessonCoverages);
router.get('/:id', authenticate, getLessonCoverageById);
router.put('/:id', authenticate, authorize('admin', 'teacher'), validate(updateLessonCoverageSchema), updateLessonCoverage);
router.delete('/:id', authenticate, authorize('admin', 'teacher'), deleteLessonCoverage);

export default router;
