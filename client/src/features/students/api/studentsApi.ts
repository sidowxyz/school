import api from '../../../lib/axios';
import type {
  Student,
  CreateStudentPayload,
  StudentListResult,
  StudentReferenceData,
  CreateStudentAccountResult,
  AttendancePortalResult,
  InvoicesPortalResult,
  StudentDocument,
} from '../types';

export const studentsApi = {
  getAll:      async (params?: unknown): Promise<StudentListResult> =>
    (await api.get('/students', { params })).data.data,
  getById:     async (id: string): Promise<Student> => (await api.get(`/students/${id}`)).data.data,
  create:      async (data: CreateStudentPayload): Promise<Student> =>
    (await api.post('/students', data)).data.data,
  update:      async (id: string, data: Partial<CreateStudentPayload>): Promise<Student> =>
    (await api.put(`/students/${id}`, data)).data.data,
  delete:      (id: string) => api.delete(`/students/${id}`),
  getReferenceData: async (): Promise<StudentReferenceData> =>
    (await api.get('/students/references/all')).data.data,
  createAccount: async (id: string, data: { email: string; password?: string }): Promise<CreateStudentAccountResult> =>
    (await api.post(`/students/${id}/account`, data)).data.data,

  // Portal data (server/src/routes/studentPortalRoutes.js), admin/staff
  // viewing a specific student's real attendance and fees.
  getAttendance:  async (id: string): Promise<AttendancePortalResult> =>
    (await api.get(`/portal/student/${id}/attendance`)).data.data,
  getInvoices:    async (id: string): Promise<InvoicesPortalResult> =>
    (await api.get(`/portal/student/${id}/invoices`)).data.data,

  // Documents
  getDocuments: async (id: string): Promise<StudentDocument[]> =>
    (await api.get(`/students/${id}/documents`)).data.data,
  uploadDocument: async (id: string, file: File, name: string): Promise<StudentDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    return (await api.post(`/students/${id}/documents`, formData)).data.data;
  },
  verifyDocument: async (id: string, docId: string): Promise<StudentDocument> =>
    (await api.patch(`/students/${id}/documents/${docId}/verify`)).data.data,
  deleteDocument: (id: string, docId: string) => api.delete(`/students/${id}/documents/${docId}`),
  /** Documents are private: fetched with the signed-in user's token, then opened in a new tab. */
  openDocument: async (id: string, docId: string) => {
    const tab = window.open('', '_blank');
    try {
      const res = await api.get(`/students/${id}/documents/${docId}/file`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      if (tab) tab.location.href = url; else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      throw err;
    }
  },
};
