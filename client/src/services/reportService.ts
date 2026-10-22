import api from '../lib/axios';

export interface PendingFeeItem {
  _id: string;
  totalPending: number;
  studentDetails: Array<{ firstName?: string; lastName?: string; admission_no?: string }>;
}

export interface ReportDashboardData {
  stats: {
    totalRevenue: number;
    totalInvoices: number;
    averageInvoice: number;
  };
  monthlyData: Array<{ _id: number; monthlyTotal: number }>;
  pendingFees: PendingFeeItem[];
}

export const getReportDashboard = async (): Promise<ReportDashboardData> => {
  const response = await api.get('/reports/dashboard');
  return response.data.data as ReportDashboardData;
};
