import type { GradeBand } from './types';

// Same scale as server/src/utils/grading.js (the server sends it with results;
// this copy is for previews while marks are typed).
export const GRADE_SCALE: GradeBand[] = [
  { min: 90, grade: 'A', label: 'Excellent' },
  { min: 80, grade: 'B', label: 'Very good' },
  { min: 70, grade: 'C', label: 'Good' },
  { min: 60, grade: 'D', label: 'Satisfactory' },
  { min: 50, grade: 'E', label: 'Pass' },
  { min: 0, grade: 'F', label: 'Fail' },
];

export const gradeLetter = (percent: number | null | undefined) =>
  percent === null || percent === undefined ? null : (GRADE_SCALE.find((b) => percent >= b.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1]).grade;

/** Pastel tile per grade, so a page of results reads at a glance. */
export const GRADE_TONE: Record<string, string> = {
  A: 'bg-tile-green text-tile-foreground',
  B: 'bg-tile-blue text-tile-foreground',
  C: 'bg-tile-violet text-tile-foreground',
  D: 'bg-tile-yellow text-tile-foreground',
  E: 'bg-tile-yellow text-tile-foreground',
  F: 'bg-tile-pink text-tile-foreground',
};

export const formatPercent = (p: number | null | undefined) => (p === null || p === undefined ? '—' : `${p % 1 === 0 ? p : p.toFixed(1)}%`);

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
