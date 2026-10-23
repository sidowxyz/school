import api from '../../../lib/axios';
import type { Student } from '../../students/types';

// Response shapes

export interface PortalTimetableSlot {
  _id: string;
  day: string;
  timePeriod: string;
  room?: string;
  subject: { _id: string; sub_name: string; sub_no?: string } | null;
  teacher: { _id: string; firstName: string; lastName: string; email?: string } | null;
}

export interface PortalInvoice {
  _id: string;
  invoice_no: string;
  invoice_amount: number;
  paid_amount: number;
  balance: number;
  status: 'Unpaid' | 'Partially_Paid' | 'Paid';
  dueDate?: string;
  registerDate?: string;
  fee_struc_no?: { _id: string; fee_struc_no: string; amount: number } | null;
}

export interface PortalInvoicesResponse {
  totals: { invoiced: number; paid: number; balance: number };
  invoices: PortalInvoice[];
}

export interface PortalScholarship {
  kind: string;
  basis: string | null;
  /** A discount percentage or amount, depending on the scholarship's discount type. */
  value: number | null;
  startDate: string;
  endDate: string;
}

export interface PortalScholarshipResponse {
  /** null means the student has no scholarship or sibling-rule discount active right now. */
  active: PortalScholarship | null;
}

// Endpoints
// A logged-in student reads their own record via the "me"/self routes; an
// admin/staff member passes a studentId to read a specific student's data.
const base = (studentId?: string) => (studentId ? `/portal/student/${studentId}` : '/portal/student');

export const portalApi = {
  getMyProfile: async (): Promise<Student> =>
    (await api.get('/portal/student/me')).data.data,

  getStudentProfile: async (studentId: string): Promise<Student> =>
    (await api.get(`/portal/student/${studentId}/profile`)).data.data,

  getTimetable: async (studentId?: string): Promise<PortalTimetableSlot[]> =>
    (await api.get(`${base(studentId)}/timetable`)).data.data,

  getInvoices: async (studentId?: string): Promise<PortalInvoicesResponse> =>
    (await api.get(`${base(studentId)}/invoices`)).data.data,

  getScholarship: async (studentId?: string): Promise<PortalScholarshipResponse> =>
    (await api.get(`${base(studentId)}/scholarship`)).data.data,
};
