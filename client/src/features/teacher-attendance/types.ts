export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "Leave"
  | "Excused";

export interface TeacherAttendance {
  id: number;
  teacherName: string;
  employeeId: string;
  department: string;
  date: string;
  status: AttendanceStatus;
  timeIn: string;
  timeOut: string;
  remarks?: string;
}