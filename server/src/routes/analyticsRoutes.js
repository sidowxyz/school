import express from 'express';
import { getAdminDashboardKPIs, getTeacherDashboardKPIs, getFinanceDashboardKPIs } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// School-wide figures for the admin, principal and academic officer dashboards.
router.get('/admin-kpis', authenticate, authorize('admin', 'principal', 'academic_officer'), getAdminDashboardKPIs);
router.get('/teacher-kpis', authenticate, authorize('teacher'), getTeacherDashboardKPIs);
router.get('/finance-summary', authenticate, authorize('admin', 'accountant'), getFinanceDashboardKPIs);

export default router;