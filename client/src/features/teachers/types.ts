export interface Teacher {
  _id: string;
  staffId: string;
  department?: string;
  qualifications?: string;
  status: "Active" | "On Leave" | "Inactive";
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface CreateTeacherPayload {
  name: string;
  email: string;
  password?: string;
  department?: string;
  qualifications?: string;
  status?: "Active" | "On Leave" | "Inactive";
}

export interface CreateTeacherResult {
  teacher: Teacher;
  user: { _id: string; name: string; email: string; role: string };
  temporaryPassword: string;
}

export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface RefPeriod { _id: string; per_no: string; per_name: string; time_in: string; time_out: string }

// As returned by the API — periodId is populated with the real period.
export interface TimetableSlot {
  _id?: string;
  day: Weekday;
  periodId: RefPeriod;
}

// As submitted to the API — periodId is just the raw id.
export interface TimetableSlotInput {
  day: Weekday;
  periodId: string;
}

export interface RefSubject { _id: string; sub_name: string; subjectCode?: string; sub_no: string }
export interface RefLevel { _id: string; lev_name: string; lev_no: string }
export interface RefClass { _id: string; cl_name: string; cl_no: string; lev_no?: RefLevel }
export interface RefSection { _id: string; name: string }
export interface RefYear { _id: string; y_name: string; y_no: string }
export interface RefTerm { _id: string; name: string; academicYearId?: RefYear }

export interface RefAssignmentTeacher {
  _id: string;
  userId?: { _id: string; firstName: string; lastName: string };
}

export interface TeacherAssignment {
  _id: string;
  // Populated (with the teacher's name) only by the all-assignments list
  // endpoint (teachersApi.getAllAssignments) — a plain id string elsewhere.
  teacherId: string | RefAssignmentTeacher;
  subjectId: RefSubject;
  classId: RefClass;
  sectionId: RefSection;
  termId: RefTerm;
  timetableSlots: TimetableSlot[];
}

export interface TeacherDetail {
  teacher: Teacher;
  assignments: TeacherAssignment[];
}

export interface CreateAssignmentPayload {
  subjectId: string;
  classId: string;
  sectionId: string;
  termId: string;
  timetableSlots: TimetableSlotInput[];
}
