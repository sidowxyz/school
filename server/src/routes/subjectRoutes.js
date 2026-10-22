import express from 'express';
import { createSubject, getSubjects, getSubjectById, updateSubject, deleteSubject } from '../controllers/subjectController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.route('/')
  .post(authenticate, authorize('admin', 'principal'), createSubject)
  .get(authenticate, getSubjects);

router.route('/:id')
  .get(authenticate, getSubjectById)
  .put(authenticate, authorize('admin', 'principal'), updateSubject)
  .delete(authenticate, authorize('admin', 'principal'), deleteSubject);

export default router;
