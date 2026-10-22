import type { GradeLetter, MarkSubmission, SubmissionStats } from '../types';

/**
 * Presentation constants for grading. The grade a result carries is decided
 * server-side (server/src/utils/examGrading.js); these bands only supply the
 * matching label and colour, and the local preview of a grade while a teacher
 * is still typing marks.
 */
export interface GradeBand {
  grade: GradeLetter;
  min: number;
  label: string;
  color: string;
}

export const GRADE_BANDS: GradeBand[] = [
  { grade: 'A+', min: 90, label: 'Outstanding', color: '#16a34a' },
  { grade: 'A', min: 80, label: 'Excellent', color: '#3b82f6' },
  { grade: 'B+', min: 75, label: 'Very Good', color: '#f59e0b' },
  { grade: 'B', min: 70, label: 'Good', color: '#8b5cf6' },
  { grade: 'C+', min: 65, label: 'Above Average', color: '#ec4899' },
  { grade: 'C', min: 60, label: 'Average', color: '#06b6d4' },
  { grade: 'D', min: 50, label: 'Pass', color: '#f97316' },
  { grade: 'F', min: 0, label: 'Fail', color: '#ef4444' },
];

export const PASS_PERCENTAGE = 50;

export function gradeFor(percentage: number): GradeLetter {
  return GRADE_BANDS.find((b) => percentage >= b.min)?.grade ?? 'F';
}

export function gradeColor(grade: GradeLetter): string {
  return GRADE_BANDS.find((b) => b.grade === grade)?.color ?? '#64748b';
}

export function gradeMeta(grade: GradeLetter): GradeBand {
  return GRADE_BANDS.find((b) => b.grade === grade) ?? GRADE_BANDS[GRADE_BANDS.length - 1];
}

/** Live stats for a submission — used while marks are still being typed. */
export function subStats(sub: Pick<MarkSubmission, 'entries' | 'maxMarks' | 'passMarks'>): SubmissionStats {
  const passMark = sub.passMarks ?? (PASS_PERCENTAGE / 100) * sub.maxMarks;
  const valid = sub.entries.filter(
    (e) => e.marks !== null && e.marks >= 0 && e.marks <= sub.maxMarks,
  );
  const passCount = valid.filter((e) => e.marks! >= passMark).length;
  const average = valid.length
    ? Math.round((valid.reduce((a, e) => a + e.marks!, 0) / valid.length) * 10) / 10
    : 0;
  return {
    entered: sub.entries.filter((e) => e.marks !== null).length,
    total: sub.entries.length,
    average,
    passCount,
    failCount: valid.length - passCount,
  };
}
