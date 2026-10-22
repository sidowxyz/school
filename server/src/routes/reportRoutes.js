import express from 'express';
import {
  getCatalog,
  runReport,
  exportReport,
  getManagementSummary,
  getAuditLog
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = express.Router();

// GET /api/reports/catalog  - Departments and reports available to this role.
// No authorize() here on purpose: the catalogue is already filtered by role,
// and a role with no reports simply gets an empty list.
router.get('/catalog', authenticate, getCatalog);

// GET /api/reports/management/summary - Management dashboard tiles.
// Declared before /run/:id so "management" isn't parsed as a report id.
router.get('/management/summary', authenticate, getManagementSummary);

// GET /api/reports/audit - Recent report accesses (admin-only).
router.get('/audit', authenticate, getAuditLog);

// GET /api/reports/run/:id  - Run one report. Per-report role checks live in
// the registry, so this route only needs authentication.
router.get('/run/:id', authenticate, runReport);

// GET /api/reports/run/:id/export?format=pdf|xlsx  - Same report, streamed as
// a downloadable file. Same access rules as /run/:id.
router.get('/run/:id/export', authenticate, exportReport);

export default router;
