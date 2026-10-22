import api from '../lib/axios';

export interface ClassData {
  _id: string;
  cl_name: string;
  cl_no: string;
}

export interface SectionData {
  _id: string;
  name: string;
  // GET /sections populates this with the Class document, not a raw id.
  class: string | { _id: string; cl_name?: string; cl_no?: string };
}

export function sectionClassId(section: SectionData): string {
  return typeof section.class === 'string' ? section.class : section.class._id;
}

export interface Term {
  _id: string;
  name: string;
  status: string;
}

export interface Period {
  _id: string;
  per_name: string;
  per_no: string;
  time_in: string;
  time_out: string;
}

export interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classId?: ClassData | string;
  sectionId?: SectionData | string;
}

export interface StudentAttendanceRecord {
  _id?: string;
  studentId: Student | string;
  periodId: Period | string;
  status: AttendanceStatusName;
  att_date: string;
  remarks?: string;
}

export interface Staff {
  _id: string;
  staffId: string;
  department?: string;
  status: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
  };
}

export type AttendanceStatusName = 'Present' | 'Absent' | 'Late' | 'Excused';
export const ATTENDANCE_STATUSES: AttendanceStatusName[] = ['Present', 'Absent', 'Late', 'Excused'];

export interface StaffAttendanceRecord {
  _id?: string;
  teacherId: Staff | string;
  status: AttendanceStatusName;
  att_date: string;
  time_in?: string;
  time_out?: string;
  remarks?: string;
}

export const attendanceService = {
  // Student Attendance
  async getTerms(): Promise<Term[]> {
    const res = await api.get<{ success: boolean; data: Term[] }>('/terms');
    return res.data.data;
  },

  async getClasses(): Promise<ClassData[]> {
    const res = await api.get<{ success: boolean; data: ClassData[] }>('/classes');
    return res.data.data;
  },

  async getSections(): Promise<SectionData[]> {
    const res = await api.get<{ success: boolean; data: SectionData[] }>('/sections');
    return res.data.data;
  },

  // Periods are term-scoped (one term might run 6 periods/day, another 7).
  async getPeriods(termId: string): Promise<Period[]> {
    const res = await api.get<{ success: boolean; data: Period[] }>('/periods', { params: { termId } });
    return res.data.data;
  },

  async getEnrolledStudents(classId: string, sectionId: string): Promise<Student[]> {
    const res = await api.get<{ success: boolean; data: { students: Student[] } }>(
      '/students', { params: { classId, sectionId, status: 'Active', limit: 200 } }
    );
    return res.data.data.students;
  },

  async getStudentAttendance(params: {
    classId?: string;
    sectionId?: string;
    studentId?: string;
    date?: string;
    periodId?: string;
    limit?: number;
  }): Promise<StudentAttendanceRecord[]> {
    const query = new URLSearchParams();
    if (params.classId) query.append('classId', params.classId);
    if (params.sectionId) query.append('sectionId', params.sectionId);
    if (params.studentId) query.append('studentId', params.studentId);
    if (params.date) query.append('date', params.date);
    if (params.periodId) query.append('periodId', params.periodId);
    if (params.limit) query.append('limit', String(params.limit));

    const res = await api.get<{ success: boolean; data: StudentAttendanceRecord[] }>(`/attendance?${query.toString()}`);
    return res.data.data;
  },

  async saveStudentAttendance(payload: {
    periodId: string;
    att_date: string;
    attendance: Array<{
      studentId: string;
      status: AttendanceStatusName;
      remarks?: string;
    }>;
  }): Promise<any> {
    const res = await api.post('/attendance', payload);
    return res.data;
  },

  async getStudentMonthlyReport(params: { year: string; month: string; classId?: string; sectionId?: string }): Promise<any> {
    const query = new URLSearchParams({ year: params.year, month: params.month });
    if (params.classId) query.append('classId', params.classId);
    if (params.sectionId) query.append('sectionId', params.sectionId);
    const res = await api.get(`/attendance/report?${query.toString()}`);
    return res.data.data;
  },

  // Staff/Teacher Attendance
  async getStaff(): Promise<Staff[]> {
    const res = await api.get<{ success: boolean; data: Staff[] }>('/teachers');
    return res.data.data;
  },

  async getStaffAttendance(params: {
    teacherId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<StaffAttendanceRecord[]> {
    const query = new URLSearchParams();
    if (params.teacherId) query.append('teacherId', params.teacherId);
    if (params.date) query.append('date', params.date);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.limit) query.append('limit', String(params.limit));

    const res = await api.get<{ success: boolean; data: StaffAttendanceRecord[] }>(`/staff-attendance?${query.toString()}`);
    return res.data.data;
  },

  async saveStaffAttendance(payload: {
    att_date: string;
    attendance: Array<{
      teacherId: string;
      status: AttendanceStatusName;
      time_in?: string;
      time_out?: string;
      remarks?: string;
    }>;
  }): Promise<any> {
    const res = await api.post('/staff-attendance', payload);
    return res.data;
  },

  async getStaffMonthlyReport(params: { year: string; month: string; department?: string }): Promise<any> {
    const query = new URLSearchParams({ year: params.year, month: params.month });
    if (params.department) query.append('department', params.department);
    const res = await api.get(`/staff-attendance/report?${query.toString()}`);
    return res.data.data;
  }
};
