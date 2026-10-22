import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  seedAccounts,
} from '../controllers/chartOfAccountsController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getAccounts);
router.post('/seed', authorize('admin'), seedAccounts);
router.post('/', authorize('admin'), createAccount);
router.put('/:id', authorize('admin'), updateAccount);
router.delete('/:id', authorize('admin'), deleteAccount);

export default router;
