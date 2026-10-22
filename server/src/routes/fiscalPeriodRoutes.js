import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getFiscalYears,
  createFiscalYear,
  closeFiscalYear,
  getAccountingPeriods,
  createAccountingPeriod,
  closeAccountingPeriod,
} from '../controllers/fiscalPeriodController.js';

const router = express.Router();

router.use(authenticate);

// Fiscal Years
router.get('/years', getFiscalYears);
router.post('/years', authorize('admin'), createFiscalYear);
router.patch('/years/:id/close', authorize('admin'), closeFiscalYear);

// Accounting Periods
router.get('/periods', getAccountingPeriods);
router.post('/periods', authorize('admin'), createAccountingPeriod);
router.patch('/periods/:id/close', authorize('admin'), closeAccountingPeriod);

export default router;
