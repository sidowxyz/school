import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlowStatement,
  getArAgingReport,
} from '../controllers/financialReportController.js';

const router = express.Router();

router.use(authenticate);

router.get('/income-statement', getIncomeStatement);
router.get('/balance-sheet', getBalanceSheet);
router.get('/cash-flow', getCashFlowStatement);
router.get('/ar-aging', getArAgingReport);

export default router;
