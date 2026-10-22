import { useEffect, useMemo, useState } from 'react';

import { academicApi } from '../../academic-structure/api/academicApi';
import type { Class, Subject } from '../../academic-structure/types';
import { examsApi } from '../../examinations/api/examsApi';
import { examPeriodsApi } from '../../examinations/api/examPeriodsApi';
import type { Exam, ExamPeriod } from '../../examinations/types';

/**
 * A results scope is either a whole examination period (Class 6 sat 10
 * subjects across "Term 1 Examinations") or one individual exam record.
 * Encoded as "period:<id>" / "exam:<id>" so a single <select> can offer both.
 */
export type ScopeValue = string;

export interface ScopeOption {
  value: ScopeValue;
  label: string;
}

const refId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String((value as { _id?: string })._id ?? '');
};

/** Turn a scope value into the query params /api/exam-results expects. */
export function scopeParams(scope: ScopeValue): { exam_period_id?: string; exam_id?: string } {
  if (scope.startsWith('period:')) return { exam_period_id: scope.slice(7) };
  if (scope.startsWith('exam:')) return { exam_id: scope.slice(5) };
  return {};
}

/**
 * Loads the real examinations, periods, classes and subjects that back every
 * filter in the results views. Nothing here is hardcoded — an empty school
 * yields empty dropdowns rather than invented ones.
 */
export function useResultScope() {
  const [periods, setPeriods] = useState<ExamPeriod[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState<ScopeValue>('');
  const [classId, setClassId] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      examPeriodsApi.getAll(),
      examsApi.getAll({ limit: 500 }),
      academicApi.getClasses(),
      academicApi.getSubjects(),
    ])
      .then(([p, e, c, s]) => {
        if (cancelled) return;
        setPeriods(p);
        setExams(e.exams);
        setClasses(c);
        setSubjects(s);
        setScope((current) => current || (p[0] ? `period:${p[0]._id}` : e.exams[0] ? `exam:${e.exams[0]._id}` : ''));
        setClassId((current) => current || c[0]?._id || '');
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load examinations and classes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Periods first (the usual reporting unit), then any exam not on a
  // timetable so standalone exams stay reachable.
  const scopeOptions = useMemo<ScopeOption[]>(() => {
    const options: ScopeOption[] = periods.map((p) => ({
      value: `period:${p._id}`,
      label: `${p.name} (${p.start_date.slice(0, 10)} → ${p.end_date.slice(0, 10)})`,
    }));

    const standalone = exams.filter((e) => !refId(e.exam_period_id));
    const seen = new Set<string>();
    for (const exam of standalone) {
      if (seen.has(exam._id)) continue;
      seen.add(exam._id);
      const subject = typeof exam.subject_id === 'object' ? exam.subject_id.sub_name : null;
      options.push({
        value: `exam:${exam._id}`,
        label: subject ? `${exam.name} — ${subject}` : exam.name,
      });
    }

    return options;
  }, [periods, exams]);

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c._id, label: c.cl_name })),
    [classes],
  );

  /** Exams inside the selected scope, narrowed to the selected class. */
  const examsInScope = useMemo(() => {
    if (!scope) return [];
    if (scope.startsWith('exam:')) {
      const id = scope.slice(5);
      return exams.filter((e) => e._id === id);
    }
    const periodId = scope.slice(7);
    return exams.filter(
      (e) => refId(e.exam_period_id) === periodId && (!classId || refId(e.class_id) === classId),
    );
  }, [scope, exams, classId]);

  return {
    periods,
    exams,
    classes,
    subjects,
    loading,
    error,
    scope,
    setScope,
    scopeOptions,
    classId,
    setClassId,
    classOptions,
    examsInScope,
    refId,
  };
}
