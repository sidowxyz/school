import express from 'express';
import { createYear, getYears, getYearById, updateYear, deleteYear, getCurrentYear } from '../controllers/yearController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.route('/')
  .post(authenticate, authorize('admin', 'principal'), createYear)
  .get(authenticate, getYears);

// Must come before '/:id' or Express would treat "current" as an :id param.
router.get('/current', authenticate, getCurrentYear);

router.route('/:id')
  .get(authenticate, getYearById)
  .put(authenticate, authorize('admin', 'principal'), updateYear)
  .delete(authenticate, authorize('admin', 'principal'), deleteYear);

export default router;
