import api from '../../../lib/axios';
import type { Student } from '../../students/types';
import type { PortalResult, PortalInvoicesResponse, PortalMessagesResponse } from '../../student-portal/api/portalApi';
import type { MyAttendanceResponse } from '../../student-portal/api/attendanceApi';

export interface ParentNotice {
  _id: string;
  title: string;
  content?: string;
  category?: string;
  is_published: boolean;
  published_at?: string;
  createDate?: string;
}

// guardianId is supplied when an admin views a specific parent's portal; omitted
// when a logged-in parent reads their own family's data. The child's studentId is
// always required. Child linkage is verified server-side either way.
const childrenBase = (guardianId?: string) =>
  guardianId ? `/portal/parent/${guardianId}/children` : '/portal/parent/children';
const childBase = (studentId: string, guardianId?: string) =>
  `${childrenBase(guardianId)}/${studentId}`;

export const parentPortalApi = {
  getChildren: async (guardianId?: string): Promise<Student[]> =>
    (await api.get(childrenBase(guardianId))).data.data,

  getChildProfile: async (studentId: string, guardianId?: string): Promise<Student> =>
    (await api.get(`${childBase(studentId, guardianId)}/profile`)).data.data,

  getChildAttendance: async (studentId: string, guardianId?: string): Promise<MyAttendanceResponse> =>
    (await api.get(`${childBase(studentId, guardianId)}/attendance`)).data.data,

  getChildInvoices: async (studentId: string, guardianId?: string): Promise<PortalInvoicesResponse> =>
    (await api.get(`${childBase(studentId, guardianId)}/invoices`)).data.data,

  getChildResults: async (studentId: string, guardianId?: string): Promise<PortalResult[]> =>
    (await api.get(`${childBase(studentId, guardianId)}/results`)).data.data,

  // Guardian-scoped (not per-child): published notices and the guardian's inbox.
  getNotices: async (guardianId?: string): Promise<ParentNotice[]> =>
    (await api.get(guardianId ? `/portal/parent/${guardianId}/notices` : '/portal/parent/notices')).data.data,

  getMessages: async (guardianId?: string): Promise<PortalMessagesResponse> =>
    (await api.get(guardianId ? `/portal/parent/${guardianId}/messages` : '/portal/parent/messages')).data.data,
};
