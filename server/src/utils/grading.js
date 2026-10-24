// The school's grading scale, from a percentage to a letter grade.
// Keep in step with client/src/features/exams/grading.ts.
export const GRADE_SCALE = [
  { min: 90, grade: 'A', label: 'Excellent' },
  { min: 80, grade: 'B', label: 'Very good' },
  { min: 70, grade: 'C', label: 'Good' },
  { min: 60, grade: 'D', label: 'Satisfactory' },
  { min: 50, grade: 'E', label: 'Pass' },
  { min: 0, grade: 'F', label: 'Fail' },
];

export const PASS_PERCENT = 50;

/** Percentage (0-100, or null when nothing is marked) to { grade, label, passed }. */
export const gradeFor = (percent) => {
  if (percent === null || percent === undefined || Number.isNaN(percent)) return null;
  const band = GRADE_SCALE.find((b) => percent >= b.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
  return { grade: band.grade, label: band.label, passed: percent >= PASS_PERCENT };
};

/** One decimal place, the way report cards show percentages. */
export const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Rank students by percentage, highest first. Equal scores share a position
 * (1, 2, 2, 4). Students with nothing marked get no position.
 */
export const rankByPercent = (rows) => {
  const ranked = rows.filter((r) => r.percent !== null).sort((a, b) => b.percent - a.percent);
  const positions = new Map();
  ranked.forEach((r, i) => {
    const prev = ranked[i - 1];
    positions.set(r.key, prev && prev.percent === r.percent ? positions.get(prev.key) : i + 1);
  });
  return positions;
};
