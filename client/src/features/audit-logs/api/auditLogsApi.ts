import api from '../../../lib/axios';
import type { AuditLog } from '../types';

/**
 * Real audit-log API, replacing the hardcoded array this feature previously
 * rendered.
 *
 * Note the envelope: this endpoint returns { success, pagination, data } with
 * pagination as a *sibling* of data, unlike most endpoints where everything
 * sits under `data`. Reading `res.data.data` here gives the rows.
 */

interface BackendAuditLog {
  _id: string;
  audit_no: number;
  user: { id: string; name: string; email: string; role: string } | null;
  action: string;
  module: string;
  record_id: string | null;
  before_changes: unknown;
  after_changes: unknown;
  ip_address: string;
  createdAt: string;
}

export interface AuditLogQuery {
  module?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogPage {
  logs: AuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * The backend stores no explicit status column. Rather than invent one, this
 * derives it from the action name: the assistant records failures with a
 * _FAILED suffix, so those surface as Failed and everything else as Success.
 */
const deriveStatus = (action: string): AuditLog['status'] => {
  const upper = action.toUpperCase();
  if (upper.endsWith('_FAILED') || upper.includes('FAIL')) return 'Failed';
  if (upper.includes('CANCEL')) return 'Warning';
  return 'Success';
};

/** The detail modal renders flat key/value pairs, so nested values are stringified. */
const toFlatRecord = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, val]) => {
      acc[key] =
        val === null || val === undefined
          ? '—'
          : typeof val === 'object'
            ? JSON.stringify(val)
            : String(val);
      return acc;
    },
    {}
  );
};

const toAuditLog = (row: BackendAuditLog): AuditLog => ({
  id: row.audit_no,
  user: row.user?.name?.trim() || 'System',
  role: row.user?.role ?? 'unknown',
  module: row.module,
  action: row.action,
  status: deriveStatus(row.action),
  ip: row.ip_address,
  timestamp: row.createdAt,
  before: toFlatRecord(row.before_changes),
  after: toFlatRecord(row.after_changes),
});

export const auditLogsApi = {
  list: async (params: AuditLogQuery = {}): Promise<AuditLogPage> => {
    const res = await api.get('/audit-logs', { params });
    return {
      logs: (res.data.data as BackendAuditLog[]).map(toAuditLog),
      pagination: res.data.pagination,
    };
  },
};

export default auditLogsApi;
