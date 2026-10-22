/**
 * Percentage-based grading for examination results.
 *
 * Separate from utils/gradingEngine.js, which grades the older CA(40)+exam(60)
 * Mark records on a fixed 100-point total. Exam results are scored against
 * whatever total_marks the examination was configured with, so the band has
 * to be decided on percentage.
 */
export const GRADE_BANDS = [
  { grade: 'A+', min: 90, label: 'Outstanding' },
  { grade: 'A', min: 80, label: 'Excellent' },
  { grade: 'B+', min: 75, label: 'Very Good' },
  { grade: 'B', min: 70, label: 'Good' },
  { grade: 'C+', min: 65, label: 'Above Average' },
  { grade: 'C', min: 60, label: 'Average' },
  { grade: 'D', min: 50, label: 'Pass' },
  { grade: 'F', min: 0, label: 'Fail' }
];

export const gradeForPercentage = (percentage) =>
  GRADE_BANDS.find((band) => percentage >= band.min)?.grade ?? 'F';

export const gradeLabel = (grade) =>
  GRADE_BANDS.find((band) => band.grade === grade)?.label ?? '';

/** Round to one decimal place — the precision every results view displays. */
export const round1 = (value) => Math.round(value * 10) / 10;

export const percentageOf = (obtained, max) => (max > 0 ? round1((obtained / max) * 100) : 0);

/**
 * Competition ranking (1, 2, 2, 4) over an array already sorted descending
 * by `key`. Ties share a rank rather than being ordered arbitrarily.
 */
export const assignRanks = (rows, key = 'totalObtained') => {
  const ranked = [];
  rows.forEach((row, index) => {
    const previous = ranked[index - 1];
    const tied = previous && rows[index - 1][key] === row[key];
    ranked.push({ ...row, rank: tied ? previous.rank : index + 1 });
  });
  return ranked;
};
