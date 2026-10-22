import express from 'express';
import { createTerm, getTerms, getTermById, updateTerm, deleteTerm } from '../controllers/termController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.route('/')
  .post(authenticate, authorize('admin', 'principal'), createTerm)
  .get(authenticate, getTerms);

router.route('/:id')
  .get(authenticate, getTermById)
  .put(authenticate, authorize('admin', 'principal'), updateTerm)
  .delete(authenticate, authorize('admin', 'principal'), deleteTerm);

export default router;
