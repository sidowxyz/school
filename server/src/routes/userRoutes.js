import express from 'express';
import {
  createUser,
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  resetUserPassword
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { auditLogger } from '../middleware/auditLogger.js';
import { createUserSchema, updateUserRoleSchema, updateUserStatusSchema } from '../validators/userValidator.js';

const router = express.Router();

// All user administration is admin-only.
router.use(authenticate, authorize('admin'));

router.post('/', validate(createUserSchema), auditLogger('User', 'CREATE'), createUser);
router.get('/', listUsers);
router.get('/:id', getUserById);
router.patch('/:id/role', validate(updateUserRoleSchema), auditLogger('User', 'UPDATE'), updateUserRole);
router.patch('/:id/status', validate(updateUserStatusSchema), auditLogger('User', 'UPDATE'), updateUserStatus);
router.post('/:id/reset-password', auditLogger('User', 'UPDATE'), resetUserPassword);

export default router;
