import { useCallback, useEffect, useState } from 'react';
import { auditLogsApi, type AuditLogPage } from '../api/auditLogsApi';
import type { AuditLog } from '../types';

const PAGE_SIZE = 100;

/**
 * Loads audit logs from the API.
 *
 * Fetches a page and lets the existing filter controls narrow it client-side,
 * preserving how this screen already behaves. Server-side filtering exists on
 * the endpoint and is the right next step once the log volume makes paging
 * through it necessary.
 */
export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<AuditLogPage['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await auditLogsApi.list({ page: 1, limit: PAGE_SIZE });
      setLogs(page.logs);
      setPagination(page.pagination);
    } catch {
      setError('Could not load audit logs. Please try again.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { logs, pagination, loading, error, reload: load };
}
