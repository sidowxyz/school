import express from 'express';
import {
  createUser,
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createUserSchema, updateUserRoleSchema, updateUserStatusSchema } from '../validators/userValidator.js';

const router = express.Router();

// All user administration is admin-only.
router.use(authenticate, authorize('admin'));

router.post('/', validate(createUserSchema), createUser);
router.get('/', listUsers);
router.get('/:id', getUserById);
router.patch('/:id/role', validate(updateUserRoleSchema), updateUserRole);
router.patch('/:id/status', validate(updateUserStatusSchema), updateUserStatus);

export default router;
