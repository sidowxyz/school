import api from '../../../lib/axios';
import type {
  FeeType, FeeStructure, PaymentMethod, StudentInvoice, StudentFee, StudentScholarship,
  FinanceSummary, RefLevel, RefYear, Refund,
} from '../types';

export const financeApi = {
  // ─── Reference data ────────────────────────────────────────────────────────
  getLevels: async (): Promise<RefLevel[]> => (await api.get('/levels')).data.data,
  getYears:  async (): Promise<RefYear[]>  => (await api.get('/years')).data.data,

  // ─── Fee Types ─────────────────────────────────────────────────────────────
  getFeeTypes: async (): Promise<FeeType[]> => (await api.get('/fee-types')).data.data,
  createFeeType: (data: { fee_type_no: string; fee_name: string }) => api.post('/fee-types', data),
  updateFeeType: (id: string, data: { fee_name?: string }) => api.put(`/fee-types/${id}`, data),
  deleteFeeType: (id: string) => api.delete(`/fee-types/${id}`),

  // ─── Fee Structures ────────────────────────────────────────────────────────
  getFeeStructures: async (): Promise<FeeStructure[]> => (await api.get('/fee-structures')).data.data,
  createFeeStructure: (data: { fee_struc_no: string; fee_type_no: string; lev_no: string; y_no: string; amount: number }) =>
    api.post('/fee-structures', data),
  updateFeeStructure: (id: string, data: { fee_type_no?: string; lev_no?: string; y_no?: string; amount?: number }) =>
    api.put(`/fee-structures/${id}`, data),
  deleteFeeStructure: (id: string) => api.delete(`/fee-structures/${id}`),

  // ─── Payment Methods ───────────────────────────────────────────────────────
  getPaymentMethods: async (): Promise<PaymentMethod[]> => (await api.get('/payment-methods')).data.data,
  createPaymentMethod: (data: { payment_method_no: string; payment_method_name: string }) => api.post('/payment-methods', data),
  updatePaymentMethod: (id: string, data: { payment_method_name?: string }) => api.put(`/payment-methods/${id}`, data),
  deletePaymentMethod: (id: string) => api.delete(`/payment-methods/${id}`),

  // ─── Student Invoices ──────────────────────────────────────────────────────
  getInvoices: async (params?: unknown): Promise<StudentInvoice[]> => (await api.get('/student-invoices', { params })).data.data,
  createInvoice: async (data: { student: string; fee_struc_no: string; dueDate?: string }): Promise<StudentInvoice> =>
    (await api.post('/student-invoices', data)).data.data,
  updateInvoice: (id: string, data: { dueDate?: string; status?: string; notes?: string }) =>
    api.put(`/student-invoices/${id}`, data),
  deleteInvoice: (id: string) => api.delete(`/student-invoices/${id}`),
  createBulkInvoices: async (data: { class_id: string; fee_struc_no: string; dueDate?: string }): Promise<{ createdCount: number; skippedCount: number }> =>
    (await api.post('/student-invoices/bulk', data)).data.data,

  // ─── Payments ──────────────────────────────────────────────────────────────
  getStudentFees: async (): Promise<StudentFee[]> => (await api.get('/student-fees')).data.data,
  createStudentFee: (data: { invoice_no: string; payment_method_no: string; paid_amount: number; acc_no?: string }) =>
    api.post('/student-fees', data),
  updateStudentFee: (id: string, data: { paid_amount?: number; payment_method_no?: string; notes?: string }) =>
    api.put(`/student-fees/${id}`, data),
  deleteStudentFee: (id: string) => api.delete(`/student-fees/${id}`),
  recordPayment: (data: {
    student?: string;
    invoice?: string;
    invoiceId?: string;
    payment_method?: string;
    amount_paid?: number;
    amount?: number;
    remarks?: string;
  }) => api.post('/payments', data),
  downloadReceiptPdf: async (feeId: string, filename: string): Promise<void> => {
    const res = await api.get(`/student-fees/${feeId}/receipt`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  getRefunds: async (params?: { student_id?: string; status?: string; from?: string; to?: string }): Promise<Refund[]> =>
    (await api.get('/refunds', { params })).data.data,
  createRefund: (data: { student_fee_no: string; amount: number; reason: string; payment_method_no?: string }): Promise<Refund> =>
    api.post('/refunds', data).then((r) => r.data.data),
  reverseRefund: (id: string): Promise<Refund> =>
    api.post(`/refunds/${id}/reverse`).then((r) => r.data.data),

  // ─── Student Scholarships ──────────────────────────────────────────────────
  getStudentScholarships: async (): Promise<StudentScholarship[]> => (await api.get('/student-scholarships')).data.data,
  grantScholarship: (data: { studentId: string; scholarshipTypeName: string; discountPercentage: number; validFrom: string; validTo: string; reason?: string }) =>
    api.post('/student-scholarships/grant', data),
  revokeScholarship: (id: string) => api.delete(`/student-scholarships/${id}`),
  checkStudentScholarship: async (studentId: string, amount: number = 0): Promise<{ percent: number; discountAmount: number; scholarship?: unknown }> =>
    (await api.get(`/invoices/student/${studentId}/scholarship`, { params: { amount } })).data.data,

  // ─── Dashboard aggregates ──────────────────────────────────────────────────
  getFinanceSummary: async (): Promise<FinanceSummary> => (await api.get('/v1/analytics/finance-summary')).data.data,
};
