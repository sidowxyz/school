import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createRefund,
  getRefunds,
  getRefundById,
  reverseRefund
} from '../controllers/refundController.js';
import { createRefundSchema } from '../validators/refundValidator.js';

const router = express.Router();

// Refunds sit in the same access model as the rest of the finance department
// (see FINANCE_ROLES in src/reports/financeReports.js): accountant is the role
// that actually issues them day to day, so — unlike the sibling
// /student-fees routes, which are admin-only — accountant is authorized here
// too rather than being able to read every finance report but never act on one.
const FINANCE_STAFF = ['admin', 'accountant'];

router.post('/', authenticate, authorize(...FINANCE_STAFF), validate(createRefundSchema), createRefund);
router.get('/', authenticate, authorize(...FINANCE_STAFF, 'principal'), getRefunds);
router.get('/:id', authenticate, authorize(...FINANCE_STAFF, 'principal'), getRefundById);
router.post('/:id/reverse', authenticate, authorize(...FINANCE_STAFF), reverseRefund);

export default router;
