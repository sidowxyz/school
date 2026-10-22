// ==============================
// Exam Types
// ==============================

// Admin-managed exam type ("Month 1", "Mid Exam", "Final Exam", ...) — a
// plain data record now, not a fixed list. See examTypesApi.ts.
export interface ExamType {
  _id: string;
  exam_type_no: string;
  type_name: string;
}

export type ExamStatus =
  | "scheduled"
  | "ongoing"
  | "completed"
  | "results_published";

// ==============================
// Main Exam Interface
// ==============================

export interface ExamClassRef {
  _id: string;
  cl_no: string;
  cl_name: string;
}

export interface ExamSubjectRef {
  _id: string;
  sub_no: string;
  sub_name: string;
}

export interface ExamSectionRef {
  _id: string;
  name: string;
}

// ==============================
// Examination Period (timetable)
// ==============================

export type ExamPeriodStatus = "draft" | "published" | "closed";

export interface ExamPeriodRef {
  _id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: ExamPeriodStatus;
}

// The window academic staff set aside for a round of examinations. The Exam
// records pointing at it via exam_period_id make up its timetable.
export interface ExamPeriod {
  _id: string;
  name: string;
  academic_year_id?: string | { _id: string; y_name: string };
  term_id?: string | { _id: string; name: string };
  start_date: string;
  end_date: string;
  description?: string;
  status: ExamPeriodStatus;
  publishedAt?: string;
  // Added by the list endpoint so the UI can show "8 examinations scheduled".
  exam_count?: number;
}

export interface ExamPeriodFormData {
  name: string;
  academic_year_id?: string;
  term_id?: string;
  start_date: string;
  end_date: string;
  description?: string;
}

export interface Exam {
  _id: string;

  // Academic Structure
  academic_year_id: string;
  term_id: string;

  // Populated by the server on read; a plain id string when only sent (create/update payloads)
  class_id: string | ExamClassRef;
  section_id?: string | ExamSectionRef;
  subject_id?: string | ExamSubjectRef;

  // Exam Details
  name: string;
  exam_type: string | ExamType;

  total_marks: number;
  pass_marks: number;

  description?: string;

  // Schedule — duration_minutes is what staff configure; end_time is derived
  // from start_time + duration_minutes server-side (see utils/examTime.js).
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;

  // Set when the exam belongs to a published examination timetable.
  exam_period_id?: string | ExamPeriodRef;

  // Set only when created via bulk (multi-grade) creation — groups the
  // fanned-out per-class records for display as one action.
  batch_id?: string;

  // UI Display Fields
  duration_days?: number;
  subjects_count?: number;
  grades?: string[];

  // Status
  status: ExamStatus;

  // Audit Fields
  created_at?: string;
  updated_at?: string;
}

// ==============================
// Exam Schedule
// ==============================

export interface ExamScheduleItem {
  id: string;

  exam_id: string;

  subject: string;

  grade: string;
  section: string;

  exam_date: string;

  start_time: string;
  end_time: string;

  room: string;

  teacher_name: string;

  marks: number;
}

// ==============================
// Marks Entry
// ==============================

export interface StudentMark {
  id: string;

  student_id: string;

  roll_no: string;
  student_name: string;

  marks: number;

  grade?: string;

  remarks?: string;
}

// ==============================
// Dashboard Statistics
// ==============================

export interface ExamStatistics {
  totalExams: number;

  scheduled: number;

  ongoing: number;

  completed: number;
}

// ==============================
// Form Data
// ==============================

// Scheduling: send start_time plus duration_minutes and the server derives
// end_time. Sending end_time instead works too — it derives the duration.
export interface ExamScheduleFields {
  exam_date: string;

  start_time: string;

  duration_minutes: number;

  end_time?: string;
}

export interface CreateExamFormData extends ExamScheduleFields {
  name: string;

  exam_type: string;

  academic_year_id?: string;
  term_id?: string;
  exam_period_id?: string;

  class_id: string;
  section_id?: string;
  subject_id?: string;

  total_marks: number;
  pass_marks: number;

  description?: string;
}

// One exam created across multiple grades at once — no section, since a
// bulk-created exam covers every section in each grade.
export interface CreateBulkExamFormData extends ExamScheduleFields {
  name: string;

  exam_type: string;

  academic_year_id?: string;
  term_id?: string;
  exam_period_id?: string;

  class_ids: string[];
  subject_id?: string;

  total_marks: number;
  pass_marks: number;

  description?: string;
}

// Editing targets a single exam record, so class_id is singular here even
// though creation fans out across grades. `null` detaches an optional
// reference (e.g. removing an exam from a timetable period).
export interface UpdateExamFormData extends Partial<ExamScheduleFields> {
  name?: string;

  exam_type?: string;

  academic_year_id?: string | null;
  term_id?: string | null;
  exam_period_id?: string | null;

  class_id?: string;
  section_id?: string | null;
  subject_id?: string | null;

  total_marks?: number;
  pass_marks?: number;

  description?: string;
}

// ==============================
// Timetable
// ==============================

export interface ExamTimetableResult {
  total: number;
  // _ids of exams that clash with another exam for the same class.
  conflicts: string[];
  exams: Exam[];
}
