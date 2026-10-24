import { useCallback } from 'react';
import { usePortal } from '../../context/PortalContext';
import { examsApi } from '../../../exams/api/examsApi';
import { ReportCardPanel } from '../../../exams/components/ReportCard';

/** The student's report card, term by term. Only published exams show. */
export default function ResultsTab() {
  const { studentId } = usePortal();
  const load = useCallback((termId?: string) => examsApi.studentPortalResults(studentId, termId), [studentId]);
  return <ReportCardPanel load={load} />;
}
