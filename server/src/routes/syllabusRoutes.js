import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createSyllabus,
  getAllSyllabi,
  getSyllabusById,
  updateSyllabus,
  deleteSyllabus
} from '../controllers/syllabusController.js';
import {
  createSyllabusSchema,
  updateSyllabusSchema
} from '../validators/academicEntitiesValidator.js';

const router = express.Router();

router.post('/', authenticate, authorize('admin', 'teacher'), validate(createSyllabusSchema), createSyllabus);
router.get('/', authenticate, getAllSyllabi);
router.get('/:id', authenticate, getSyllabusById);
router.put('/:id', authenticate, authorize('admin', 'teacher'), validate(updateSyllabusSchema), updateSyllabus);
router.delete('/:id', authenticate, authorize('admin', 'teacher'), deleteSyllabus);

export default router;
