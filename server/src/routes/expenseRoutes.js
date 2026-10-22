import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getExpenses,
  createExpense,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/expenseController.js';

const router = express.Router();

router.use(authenticate);

// Expense routes
router.get('/', getExpenses);
router.post('/', authorize('admin'), createExpense);

// Supplier routes
router.get('/suppliers', getSuppliers);
router.post('/suppliers', authorize('admin'), createSupplier);
router.put('/suppliers/:id', authorize('admin'), updateSupplier);
router.delete('/suppliers/:id', authorize('admin'), deleteSupplier);

export default router;
