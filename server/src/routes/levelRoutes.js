import express from 'express';
import { createLevel, getLevels, getLevelById, updateLevel, deleteLevel } from '../controllers/levelController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.route('/')
  .post(authenticate, authorize('admin', 'principal'), createLevel)
  .get(authenticate, getLevels);

router.route('/:id')
  .get(authenticate, getLevelById)
  .put(authenticate, authorize('admin', 'principal'), updateLevel)
  .delete(authenticate, authorize('admin', 'principal'), deleteLevel);

export default router;
