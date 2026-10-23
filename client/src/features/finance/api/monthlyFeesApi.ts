import api from '../../../lib/axios';
import type {
  ChargeResult, ClassFee, ClassStatus, CollectPaymentInput, FeeAccount, FeeDiscount, FeeReceipt, StudentBalancePage,
  FeeReport,
} from '../monthlyTypes';

// /api/fees — monthly class fees, counter payments, class status and report.
export const monthlyFeesApi = {
  getClassFees: async (): Promise<ClassFee[]> => (await api.get('/fees/class-fees')).data.data,
  setClassFee: async (classId: string, amount: number) =>
    (await api.put(`/fees/class-fees/${classId}`, { amount })).data.data,

  chargeMonth: async (data: { period?: string; class_id?: string } = {}): Promise<ChargeResult> =>
    (await api.post('/fees/charge', data)).data.data,

  listStudentBalances: async (params: { class_id?: string; status?: 'owing' | 'paid'; q?: string; page?: number; limit?: number }): Promise<StudentBalancePage> =>
    (await api.get('/fees/students', { params })).data.data,
  getAccount: async (studentId: string): Promise<FeeAccount> =>
    (await api.get(`/fees/students/${studentId}/account`)).data.data,
  setDiscount: async (studentId: string, discount: FeeDiscount) =>
    (await api.put(`/fees/students/${studentId}/discount`, discount)).data.data,

  collect: async (data: CollectPaymentInput): Promise<FeeReceipt> => (await api.post('/fees/collect', data)).data.data,
  getReceipt: async (id: string): Promise<FeeReceipt> => (await api.get(`/fees/receipts/${id}`)).data.data,
  listReceipts: async (params?: { student?: string; from?: string; to?: string; q?: string; limit?: number }): Promise<FeeReceipt[]> =>
    (await api.get('/fees/receipts', { params })).data.data,

  getClassStatus: async (classId: string, period: string): Promise<ClassStatus> =>
    (await api.get(`/fees/classes/${classId}/status`, { params: { period } })).data.data,

  getReport: async (params: { from: string; to: string; level_id?: string; class_id?: string }): Promise<FeeReport> =>
    (await api.get('/fees/report', { params })).data.data,
};

/** The server's message for a failed request, or a fallback. */
export const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string; errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message
  ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  ?? fallback;
