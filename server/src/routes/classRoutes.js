import express from 'express';
import { createClass, getClasses, getClassById, updateClass, deleteClass } from '../controllers/classController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.route('/')
  .post(authenticate, authorize('admin', 'principal'), createClass)
  .get(authenticate, getClasses);

router.route('/:id')
  .get(authenticate, getClassById)
  .put(authenticate, authorize('admin', 'principal'), updateClass)
  .delete(authenticate, authorize('admin', 'principal'), deleteClass);

export default router;