import express from 'express';
import { createRole, deleteRole, listRoles, updateRole } from '../controllers/roleController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { auditLogger } from '../middleware/auditLogger.js';

const router = express.Router();

// Roles decide who can do what, so only admins manage them.
router.use(authenticate, authorize('admin'));

router.get('/', listRoles);
router.post('/', auditLogger('AccessRole', 'CREATE'), createRole);
router.put('/:id', auditLogger('AccessRole', 'UPDATE'), updateRole);
router.delete('/:id', auditLogger('AccessRole', 'DELETE'), deleteRole);

export default router;
