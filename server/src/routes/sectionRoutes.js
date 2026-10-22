import express from 'express';
import { createSection, getSections, getSectionById, updateSection, deleteSection } from '../controllers/sectionController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.route('/')
  .post(authenticate, authorize('admin', 'principal'), createSection)
  .get(authenticate, getSections);

router.route('/:id')
  .get(authenticate, getSectionById)
  .put(authenticate, authorize('admin', 'principal'), updateSection)
  .delete(authenticate, authorize('admin', 'principal'), deleteSection);

export default router;
