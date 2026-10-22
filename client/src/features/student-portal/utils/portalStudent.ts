import type { Student, RefClass, RefSection } from '../../students/types';

// Small helpers that read a real Student record safely — classId/sectionId come
// back either populated (objects) or as raw id strings depending on the endpoint.

export const fullName = (s: Student): string =>
  `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'Unknown Student';

export const initialsOf = (s: Student): string =>
  `${s.firstName?.[0] ?? ''}${s.lastName?.[0] ?? ''}`.toUpperCase() || '?';

export const classNameOf = (s: Student): string =>
  s.classId && typeof s.classId === 'object' ? (s.classId as RefClass).cl_name : '—';

export const sectionNameOf = (s: Student): string =>
  s.sectionId && typeof s.sectionId === 'object' ? (s.sectionId as RefSection).name : '—';

// "Grade 10 – Section A" style label used in the profile banner.
export const classSectionLabel = (s: Student): string => {
  const cls = classNameOf(s);
  const sec = sectionNameOf(s);
  if (cls === '—' && sec === '—') return '—';
  if (sec === '—') return cls;
  return `${cls} – Section ${sec.replace(/^Section\s+/i, '')}`;
};
