import { useCallback } from 'react';
import { Exam } from '@phosphor-icons/react';
import { EmptyState } from '@/components/common/EmptyState';
import { useParentPortal } from '../../context/ParentContext';
import { examsApi } from '../../../exams/api/examsApi';
import { ReportCardPanel } from '../../../exams/components/ReportCard';

/** The selected child's report card. Only published exams show. */
export default function ResultsTab() {
  const { guardianId, childId } = useParentPortal();
  const load = useCallback((termId?: string) => examsApi.parentPortalResults(childId!, guardianId, termId), [childId, guardianId]);
  if (!childId) return <EmptyState icon={Exam} tint="green" title="No child selected" text="Pick a child above to see their results." />;
  // Keyed on the child so switching children reloads the card.
  return <ReportCardPanel key={childId} load={load} />;
}
