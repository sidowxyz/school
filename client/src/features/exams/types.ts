export interface TermRef { _id: string; name: string; year: string | null }

export interface ExamItem {
  _id: string;
  name: string;
  termId: string | null;
  term: TermRef | null;
  maxMarks: number;
  date: string | null;
  classIds: string[];
  classes: { _id: string; name: string }[];
  published: boolean;
  progress: { marks: number; students: number };
}

export interface ExamInput {
  name: string;
  termId: string;
  maxMarks: number;
  date: string | null;
  classIds: string[];
}

export interface MarkingOptions {
  classes: { _id: string; name: string }[];
  sections: { _id: string; name: string; classId: string }[];
  subjects: { _id: string; name: string; classId: string | null }[];
  /** A teacher's own lessons; null for staff who can mark anything. */
  pairs: { classId: string; sectionId: string; subjectId: string }[] | null;
  locked: boolean;
}

export interface MarkRow {
  studentId: string;
  name: string;
  admissionNumber?: string;
  score: number | null;
  absent: boolean;
  remark: string;
}

export interface Marksheet {
  exam: { _id: string; name: string; maxMarks: number; published: boolean };
  locked: boolean;
  rows: MarkRow[];
}

export interface Grade { grade: string; label: string; passed: boolean }
export interface GradeBand { min: number; grade: string; label: string }

export interface Tally {
  earned: number;
  possible: number;
  percent: number | null;
  grade: Grade | null;
}

export interface SubjectTally extends Tally {
  scores: Record<string, { score: number | null; absent: boolean; remark?: string }>;
}

export interface ResultExam { _id: string; name: string; maxMarks: number; published: boolean; date: string | null }

export interface ClassResults {
  term: TermRef;
  exams: ResultExam[];
  subjects: { _id: string; name: string; code: string | null; average: number | null; passed: number; marked: number }[];
  students: (Tally & {
    student: { _id: string; name: string; admissionNumber?: string; section: string | null };
    subjects: Record<string, SubjectTally>;
    position: number | null;
  })[];
  summary: { students: number; marked: number; average: number | null; passed: number };
  gradeScale: GradeBand[];
  passPercent: number;
}

export interface ReportCard {
  student: { _id: string; name: string; admissionNumber?: string; gender?: string };
  className: string | null;
  sectionName: string | null;
  term: TermRef;
  exams: ResultExam[];
  subjects: ({ _id: string; name: string; code: string | null; average: number | null } & SubjectTally)[];
  total: Tally | null;
  position: number | null;
  classSize: number;
  classAverage: number | null;
  gradeScale: GradeBand[];
  passPercent: number;
}

export interface ReportCardResponse {
  terms: TermRef[];
  card: ReportCard | null;
}
