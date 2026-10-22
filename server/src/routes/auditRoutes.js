import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// Only admin users can view the audit logs
router.get('/', authenticate, authorize('admin'), getAuditLogs);

export default router;
