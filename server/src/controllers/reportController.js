import { canRun, getCatalogFor, getReport } from '../reports/registry.js';
import { buildManagementSummary } from '../reports/managementDashboard.js';
import { streamExcel, streamPdf } from '../reports/exporters.js';
import ReportAccessLog from '../models/ReportAccessLog.js';

// Roles allowed to see the Management Dashboard summary. Admin and principal
// only — this rolls up figures across every department, which academic /
// finance / library staff cannot see on their own catalogues.
const MANAGEMENT_ROLES = ['admin', 'principal'];

// Query-string keys that aren't real report filters — stripped before
// audit-logging so the recorded filters mirror what the user actually chose.
const NON_FILTER_KEYS = new Set(['format']);

const filterSnapshot = (query) => {
  const snapshot = {};
  for (const [key, value] of Object.entries(query || {})) {
    if (NON_FILTER_KEYS.has(key)) continue;
    if (value === undefined || value === '') continue;
    snapshot[key] = value;
  }
  return snapshot;
};

/**
 * Persist a report-access audit row without blocking the response. A logging
 * failure must never bubble up to the caller — we surface it to the server
 * log instead.
 */
const recordAccess = (entry) => {
  ReportAccessLog.create(entry).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[reports] audit log write failed:', err.message);
  });
};

/**
 * GET /api/reports/catalog
 * The departments and reports this role may run. Reports the caller cannot
 * run are omitted rather than listed and refused.
 */
export const getCatalog = async (req, res, next) => {
  try {
    res.json({ success: true, data: getCatalogFor(req.user.role) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/run/:id
 * Run one report with the query string as its filters. Every report resolves
 * to the same { columns, rows, summary } shape, so one client component
 * renders any of them.
 */
export const runReport = async (req, res, next) => {
  try {
    const definition = getReport(req.params.id);

    if (!definition) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    if (!canRun(definition, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Your role does not have access to this report'
      });
    }

    const startedAt = Date.now();
    const result = await definition.run(req.query, { user: req.user });

    recordAccess({
      user_id: req.user._id,
      role: req.user.role,
      reportId: definition.id,
      reportTitle: definition.title,
      department: definition.department,
      action: 'view',
      filters: filterSnapshot(req.query),
      rowCount: result.rows?.length ?? 0,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null
    });

    res.json({
      success: true,
      data: {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        group: definition.group,
        department: definition.department,
        generatedAt: new Date().toISOString(),
        columns: result.columns ?? [],
        rows: result.rows ?? [],
        summary: result.summary ?? [],
        chart: result.chart ?? null
      }
    });
  } catch (error) {
    if (error.status === 400 || error.status === 403 || error.status === 404) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/reports/run/:id/export?format=pdf|xlsx
 * Same access rules as /run/:id — we run the report and pipe it out in the
 * requested format instead of returning JSON.
 */
export const exportReport = async (req, res, next) => {
  try {
    const definition = getReport(req.params.id);
    if (!definition) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    if (!canRun(definition, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Your role does not have access to this report'
      });
    }

    const format = String(req.query.format || 'xlsx').toLowerCase();
    if (format !== 'pdf' && format !== 'xlsx') {
      return res.status(400).json({
        success: false,
        message: `Unsupported export format "${format}". Use pdf or xlsx.`
      });
    }

    const startedAt = Date.now();
    const result = await definition.run(req.query, { user: req.user });
    const payload = {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      group: definition.group,
      department: definition.department,
      generatedAt: new Date().toISOString(),
      columns: result.columns ?? [],
      rows: result.rows ?? [],
      summary: result.summary ?? []
    };

    // Log before we start streaming — once bytes flow to the client the
    // response is unrecoverable, and we want the audit row either way.
    recordAccess({
      user_id: req.user._id,
      role: req.user.role,
      reportId: definition.id,
      reportTitle: definition.title,
      department: definition.department,
      action: 'export',
      format,
      filters: filterSnapshot(req.query),
      rowCount: payload.rows.length,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? null
    });

    if (format === 'xlsx') {
      await streamExcel(res, payload);
    } else {
      streamPdf(res, payload);
    }
  } catch (error) {
    if (error.status === 400 || error.status === 403 || error.status === 404) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/reports/audit?limit=&reportId=&userId=&action=
 * Recent report accesses, newest first. Admin-only because the log
 * surfaces every role's activity — a principal-level "who saw what"
 * question is answered by exporting or filtering here.
 */
export const getAuditLog = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'The report audit log is admin-only'
    });
  }
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const filter = {};
    if (req.query.reportId) filter.reportId = String(req.query.reportId);
    if (req.query.userId) filter.user_id = req.query.userId;
    if (req.query.action) filter.action = String(req.query.action);

    const rows = await ReportAccessLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: 'user_id', select: 'firstName lastName email' })
      .lean();

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/management/summary
 * Fixed-shape headline tiles for the Management Dashboard — a summary view
 * over the same data behind the detailed reports, each tile carrying a
 * `drillTo` report id the client uses to open the underlying detail.
 */
export const getManagementSummary = async (req, res, next) => {
  if (!MANAGEMENT_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'The Management Dashboard is available to admin and principal only'
    });
  }
  try {
    const data = await buildManagementSummary();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
