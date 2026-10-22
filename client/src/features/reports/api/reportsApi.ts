import api from '../../../lib/axios';
import type { ReportDepartment, ReportResult, ManagementSummary } from '../types';

export interface AdminKpis {
  summary: { totalStudents: number; totalTeachers: number; totalParents: number; totalClasses: number };
  attendanceOverview: { attendanceRate: number; weeklyData: { day: string; present: number; absent: number }[] };
  studentDistribution: { name: string; value: number }[];
  feeCollectionSummary: { totalCollected: number; totalPending: number; totalExpected: number };
}

export interface FinanceSummary {
  totals: { totalFees: number; paidFees: number; outstanding: number; collectionRate: number };
  statusDistribution: { name: string; value: number }[];
  monthlyCollection: { month: string; collected: number }[];
}

export const reportsApi = {
  /**
   * The departments and reports this role may run. Already filtered
   * server-side, so whatever comes back is safe to display and run.
   */
  getCatalog: async (): Promise<ReportDepartment[]> =>
    (await api.get('/reports/catalog')).data.data,

  /** Run one report. Filters go straight through as query params. */
  run: async (id: string, filters?: Record<string, string | number>): Promise<ReportResult> =>
    (await api.get(`/reports/run/${id}`, { params: filters })).data.data,

  /**
   * Download the report as an xlsx or pdf file. Same filters as `run` — the
   * server re-runs the report and streams the result. Returns the Blob so
   * the caller can trigger a browser download.
   */
  export: async (
    id: string,
    format: 'pdf' | 'xlsx',
    filters?: Record<string, string | number>
  ): Promise<Blob> => {
    const response = await api.get(`/reports/run/${id}/export`, {
      params: { ...filters, format },
      responseType: 'blob'
    });
    return response.data as Blob;
  },

  /** Management Dashboard tiles. Admin + principal only; 403 for any other role. */
  getManagementSummary: async (): Promise<ManagementSummary> =>
    (await api.get('/reports/management/summary')).data.data,

  // School-wide aggregates behind the overview strip. Admin only; the Reports
  // page degrades gracefully when a role can't read them.
  getAdminKpis: async (): Promise<AdminKpis> =>
    (await api.get('/v1/analytics/admin-kpis')).data.data,

  getFinanceSummary: async (): Promise<FinanceSummary> =>
    (await api.get('/v1/analytics/finance-summary')).data.data,
};
