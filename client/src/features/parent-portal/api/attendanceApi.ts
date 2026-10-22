import api from '../../../lib/axios';

export type AttendanceStatusName = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface ChildRef {
  _id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

export interface ChildAttendanceRecord {
  _id: string;
  periodId: { _id: string; per_no: string; per_name: string; time_in: string; time_out: string } | null;
  status: AttendanceStatusName;
  att_date: string;
  remarks?: string;
}

export interface ChildAttendanceResponse {
  total: number;
  summary: Partial<Record<AttendanceStatusName, number>>;
  records: ChildAttendanceRecord[];
}

export const parentAttendanceApi = {
  getMyChildren: async (): Promise<ChildRef[]> =>
    (await api.get('/portal/parent/children')).data.data,
  getChildAttendance: async (studentId: string): Promise<ChildAttendanceResponse> =>
    (await api.get(`/portal/parent/children/${studentId}/attendance`)).data.data,
};
