import api from '../../../lib/axios';

export type AttendanceStatusName = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface MyAttendanceRecord {
  _id: string;
  periodId: { _id: string; per_no: string; per_name: string; time_in: string; time_out: string } | null;
  status: AttendanceStatusName;
  att_date: string;
  remarks?: string;
}

export interface MyAttendanceResponse {
  total: number;
  summary: Partial<Record<AttendanceStatusName, number>>;
  records: MyAttendanceRecord[];
}

// studentId is supplied when an admin views a specific student; omitted when a
// logged-in student reads their own attendance.
const attendancePath = (studentId?: string) =>
  studentId ? `/portal/student/${studentId}/attendance` : '/portal/student/attendance';

export const studentAttendanceApi = {
  getMyAttendance: async (studentId?: string): Promise<MyAttendanceResponse> =>
    (await api.get(attendancePath(studentId))).data.data,
};
