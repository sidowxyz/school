import type { RefSubject, RefClass, RefSection, RefTerm, TimetableSlot } from "../teachers/types";

export interface RefTeacher {
  _id: string;
  staffId: string;
  // The assignments feed populates first/last name, not a combined name.
  userId: { _id: string; firstName?: string; lastName?: string; name?: string };
}

// A single teacher's assignment, as returned by GET /api/assignments — same
// populate shape as the teacher-scoped endpoints, but with teacherId populated
// too since this feed spans every teacher.
export interface Assignment {
  _id: string;
  teacherId: RefTeacher;
  subjectId: RefSubject;
  classId: RefClass;
  sectionId: RefSection;
  termId: RefTerm;
  timetableSlots: TimetableSlot[];
}
