import { useState, useEffect, useCallback } from 'react';
import { TeachingLog, TeachingLogFilters } from '../types/teachingLog.types';
import { teachingLogService } from '../services/teachingLog.service';

export function useTeachingLogs(initialFilters: TeachingLogFilters = {}, initialPage = 1, initialLimit = 10) {
  const [logs, setLogs] = useState<TeachingLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [filters, setFilters] = useState<TeachingLogFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await teachingLogService.getLogs(filters, page, limit);
      setLogs(result.logs);
      setTotal(result.total);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch teaching logs');
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const updateFilters = useCallback((newFilters: TeachingLogFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to page 1 on filter update
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setPage(1);
  }, [initialFilters]);

  const createLog = async (logData: Omit<TeachingLog, '_id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    try {
      const newLog = await teachingLogService.createLog(logData);
      await fetchLogs();
      return newLog;
    } catch (err: any) {
      setError(err?.message || 'Failed to create teaching log');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateLog = async (id: string, logData: Partial<Omit<TeachingLog, '_id' | 'createdAt' | 'updatedAt'>>) => {
    setLoading(true);
    try {
      const updatedLog = await teachingLogService.updateLog(id, logData);
      await fetchLogs();
      return updatedLog;
    } catch (err: any) {
      setError(err?.message || 'Failed to update teaching log');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteLog = async (id: string) => {
    setLoading(true);
    try {
      await teachingLogService.deleteLog(id);
      // Adjust page if we deleted the last item on the page
      if (logs.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchLogs();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete teaching log');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    logs,
    total,
    page,
    limit,
    filters,
    loading,
    error,
    setPage,
    updateFilters,
    resetFilters,
    createLog,
    updateLog,
    deleteLog,
    refresh: fetchLogs,
  };
}
