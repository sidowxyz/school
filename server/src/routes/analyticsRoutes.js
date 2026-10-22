import express from 'express';
import { getAdminDashboardKPIs, getTeacherDashboardKPIs, getFinanceDashboardKPIs, getAcademicPerformance } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

// ✨ Waxay ka ammaanaysaa dadka aan Admin-ka ahayn (Halkan waxaa loo beddelay getAdminDashboardKPIs)
router.get('/admin-kpis', authenticate, authorize('admin'), getAdminDashboardKPIs);
router.get('/teacher-kpis', authenticate, authorize('teacher'), getTeacherDashboardKPIs);
router.get('/finance-summary', authenticate, authorize('admin', 'accountant'), getFinanceDashboardKPIs);
router.get('/academic-performance', authenticate, authorize('admin', 'principal', 'academic_officer'), getAcademicPerformance);

export default router;