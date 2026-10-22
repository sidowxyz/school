import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getLedgerEntries,
  getLedgerSummary,
  getLedgerAccounts,
  getTrialBalance,
} from '../controllers/ledgerController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getLedgerEntries);
router.get('/summary', getLedgerSummary);
router.get('/accounts', getLedgerAccounts);
router.get('/trial-balance', getTrialBalance);

export default router;
