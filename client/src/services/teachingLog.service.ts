import api from '../lib/axios';
import { TeachingLog, TeachingLogFilters, PaginatedLogs } from '../types/teachingLog.types';

export const teachingLogService = {
  /**
   * Fetch paginated list of teaching logs with filters
   */
  async getLogs(filters: TeachingLogFilters = {}, page = 1, limit = 10): Promise<PaginatedLogs> {
    const response = await api.get('/teaching-logs', { params: { ...filters, page, limit } });
    return response.data.data;
  },

  /**
   * Fetch single teaching log by ID
   */
  async getLogById(id: string): Promise<TeachingLog> {
    const response = await api.get(`/teaching-logs/${id}`);
    return response.data.data;
  },

  /**
   * Create a new teaching log
   */
  async createLog(logData: Omit<TeachingLog, '_id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<TeachingLog> {
    const response = await api.post('/teaching-logs', logData);
    return response.data.data;
  },

  /**
   * Update an existing teaching log by ID
   */
  async updateLog(id: string, logData: Partial<Omit<TeachingLog, '_id' | 'createdAt' | 'updatedAt' | 'createdBy'>>): Promise<TeachingLog> {
    const response = await api.put(`/teaching-logs/${id}`, logData);
    return response.data.data;
  },

  /**
   * Delete a teaching log by ID
   */
  async deleteLog(id: string): Promise<void> {
    await api.delete(`/teaching-logs/${id}`);
  }
};
