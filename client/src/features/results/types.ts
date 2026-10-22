// Marks & Results domain types.
//
// These mirror the shapes returned by /api/exam-marks and /api/exam-results
// (server/src/services/examResultService.js). Everything here describes real
// records — actual exams, classes, subjects, students and teacher-entered
// marks — so there is no client-side fabrication of results anywhere.

export type GradeLetter = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

/** Where a teacher's marks sit in the review workflow. */
export type SubmissionStatus = 'draft' | 'submitted' | 'approved' | 'returned' | 'published';

// ==============================
// Marks entry
// ==============================

/** One student's mark within a teacher's submission. */
export interface StudentMarkEntry {
  studentId: string;
  rollNo: string;
  name: string;
  /** null means "not marked yet" — distinct from a score of 0. */
  marks: number | null;
  remarks: string;
}

/** A teacher's marks for one exam × class × subject. */
export interface MarkSubmission {
  /** null before the marks have ever been saved (a blank roster-backed sheet). */
  id: string | null;
  examId: string;
  examName: string;
  examDate?: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  sectionId?: string;
  sectionName?: string;
  teacherName: string;
  maxMarks: number;
  passMarks: number | null;
  entries: StudentMarkEntry[];
  status: SubmissionStatus;
  submittedAt?: string;
  reviewedAt?: string;
  publishedAt?: string;
  returnReason?: string;
}

export interface SaveSubmissionPayload {
  exam_id: string;
  class_id: string;
  subject_id: string;
  section_id?: string | null;
  entries: { studentId: string; marks: number | null; remarks?: string }[];
  status?: 'draft' | 'submitted';
}

// ==============================
// Published results
// ==============================

export interface ResultSubjectColumn {
  subjectId: string;
  name: string;
  maxMarks: number;
}

export interface SubjectMark {
  subjectId: string;
  subjectName: string;
  maxMarks: number;
  /** null when the student did not sit this subject. */
  marks: number | null;
  remarks: string;
}

export interface StudentRecord {
  id: string;
  rollNo: string;
  name: string;
  classId: string;
  className: string;
}

/** Aggregated result for one student across an examination sitting. */
export interface StudentResult {
  student: StudentRecord;
  marks: SubjectMark[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: GradeLetter;
  isPass: boolean;
  rank: number;
  status: SubmissionStatus;
}

export interface ClassResultSummary {
  total: number;
  passed: number;
  failed: number;
  passPercentage: number;
  classAverage: number;
  highest: number;
  lowest: number;
}

export interface ClassResults {
  subjects: ResultSubjectColumn[];
  results: StudentResult[];
  summary: ClassResultSummary;
}

// ==============================
// Analytics
// ==============================

export interface GradeDistributionPoint {
  grade: GradeLetter;
  label: string;
  count: number;
}

export interface SubjectAveragePoint {
  subjectId: string;
  subject: string;
  average: number;
  maxMarks: number;
  averagePercentage: number;
}

export interface PassFailPoint {
  exam: string;
  pass: number;
  fail: number;
}

export interface ResultAnalytics {
  summary: ClassResultSummary;
  gradeDistribution: GradeDistributionPoint[];
  subjectAverages: SubjectAveragePoint[];
  passFailTrend: PassFailPoint[];
}

// ==============================
// One student's results
// ==============================

export interface StudentExamResult {
  examId: string;
  examName: string;
  examDate: string;
  className: string;
  marks: SubjectMark[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: GradeLetter;
  isPass: boolean;
}

export interface StudentResultsPayload {
  student: { id: string; name: string; rollNo: string; className: string };
  exams: StudentExamResult[];
  trend: { exam: string; percentage: number }[];
  /** Position in the class for the most recent examination, when known. */
  rank: number | null;
  classSize: number | null;
}

export interface SubmissionStats {
  entered: number;
  total: number;
  average: number;
  passCount: number;
  failCount: number;
}
