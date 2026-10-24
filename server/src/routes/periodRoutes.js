import express from 'express';
import { createPeriod, getPeriods, getPeriodById, updatePeriod, deletePeriod } from '../controllers/periodController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.route('/')
  .post(authenticate, authorize('admin', 'principal', 'academic_officer'), createPeriod)
  .get(authenticate, getPeriods);

router.route('/:id')
  .get(authenticate, getPeriodById)
  .put(authenticate, authorize('admin', 'principal', 'academic_officer'), updatePeriod)
  .delete(authenticate, authorize('admin', 'principal', 'academic_officer'), deletePeriod);

export default router;
