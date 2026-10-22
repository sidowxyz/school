export type TabId = 'dashboard' | 'profile' | 'attendance' | 'results' | 'fees' | 'notices' | 'messages';

export const TAB_IDS: TabId[] = ['dashboard', 'profile', 'attendance', 'results', 'fees', 'notices', 'messages'];

export interface ParentProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  initials: string;
  rollNo: string;
  className: string;
  section: string;
  house: string;
  dob: string;
  gender: string;
  admissionDate: string;
}

export interface AttendanceSummary {
  overallRate: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalDays: number;
}

export interface Invoice {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Due' | 'Overdue' | 'Partially Paid';
  paidAmount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: string;
  receiptNo: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  date: string;
  category: 'Academic' | 'Event' | 'Fee' | 'Holiday' | 'General';
  read: boolean;
  urgent?: boolean;
}

export interface Message {
  id: string;
  from: string;
  role: string;
  avatarInitials: string;
  lastMessage: string;
  date: string;
  unread: number;
  thread: { id: string; sender: 'me' | 'them'; text: string; time: string }[];
}
