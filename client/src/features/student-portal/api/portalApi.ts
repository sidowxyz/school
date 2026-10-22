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

export interface PortalResult {
  _id: string;
  res_no: string;
  marks?: number;
  grade?: string;
  remarks?: string;
  createDate?: string;
  cc_no?: { _id: string; sub_no?: { sub_name: string; sub_no?: string } | null } | null;
  ex_r_no?: { _id: string; total_marks?: number; ex_no?: { ex_name: string } | null } | null;
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

export interface PortalNotification {
  _id: string;
  type: string;
  title: string;
  body?: string;
  is_read: boolean;
  createDate?: string;
}
export interface PortalNotificationsResponse {
  total: number;
  unread: number;
  notifications: PortalNotification[];
}

export interface PortalMessage {
  _id: string;
  subject?: string;
  message?: string;
  is_read: boolean;
  createDate?: string;
  sender_id?: { firstName?: string; lastName?: string; email?: string; role?: string } | null;
}
export interface PortalMessagesResponse {
  total: number;
  unread: number;
  messages: PortalMessage[];
}

export interface PortalBookIssue {
  _id: string;
  status: 'issued' | 'returned' | 'overdue';
  issue_date?: string;
  expected_return_date?: string;
  book_id?: {
    book_name?: string;
    isbn?: string;
    author_id?: { author_name?: string; name?: string } | null;
  } | null;
}
export interface PortalLibraryResponse {
  total: number;
  summary: Record<string, number>;
  issues: PortalBookIssue[];
}

export interface PortalReportCard {
  _id: string;
  overallScore?: number;
  createdAt?: string;
  examReg?: { total_marks?: number; ex_no?: { ex_name?: string } | null } | null;
  marks: { subject?: { sub_name?: string } | null; score: number }[];
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

  getResults: async (studentId?: string): Promise<PortalResult[]> =>
    (await api.get(`${base(studentId)}/results`)).data.data,

  getInvoices: async (studentId?: string): Promise<PortalInvoicesResponse> =>
    (await api.get(`${base(studentId)}/invoices`)).data.data,

  getScholarship: async (studentId?: string): Promise<PortalScholarshipResponse> =>
    (await api.get(`${base(studentId)}/scholarship`)).data.data,

  getNotifications: async (studentId?: string): Promise<PortalNotificationsResponse> =>
    (await api.get(`${base(studentId)}/notifications`)).data.data,

  getMessages: async (studentId?: string): Promise<PortalMessagesResponse> =>
    (await api.get(`${base(studentId)}/messages`)).data.data,

  getLibrary: async (studentId?: string): Promise<PortalLibraryResponse> =>
    (await api.get(`${base(studentId)}/library`)).data.data,

  getReportCards: async (studentId?: string): Promise<PortalReportCard[]> =>
    (await api.get(`${base(studentId)}/report-cards`)).data.data,
};
