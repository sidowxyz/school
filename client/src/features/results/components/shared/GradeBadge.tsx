import { gradeColor } from '../../data/gradeBands';
import type { GradeLetter } from '../../types';

interface Props {
  grade: GradeLetter;
  size?: 'sm' | 'md';
}

export default function GradeBadge({ grade, size = 'sm' }: Props) {
  const color = gradeColor(grade);
  const pad = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white ${pad}`}
      style={{ backgroundColor: color }}
    >
      {grade}
    </span>
  );
}
