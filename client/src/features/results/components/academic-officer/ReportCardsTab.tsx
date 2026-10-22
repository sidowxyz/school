import { useEffect, useState } from 'react';
import { FileText } from '@phosphor-icons/react';

import FilterSelect from '@/components/shared/FilterSelect';
import ReportCard from '../shared/ReportCard';
import { SkeletonTable } from '../shared/Skeleton';
import type { ClassResults } from '../../types';
import { Card } from '@/components/ui/card';

interface Props {
  examName: string;
  results: ClassResults | null;
  loading: boolean;
}

export default function ReportCardsTab({ examName, results, loading }: Props) {
  const rows = results?.results ?? [];
  const [studentId, setStudentId] = useState('');

  // Keep the selection valid when the examination or class Funnel changes.
  useEffect(() => {
    setStudentId((current) => (rows.some((r) => r.student.id === current) ? current : ''));
  }, [rows]);

  if (loading) return <SkeletonTable rows={6} />;

  if (rows.length === 0) {
    return (
      <Card className="border-border/80 shadow-xs p-12 sm:p-16 text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3.5 ring-1 ring-border/60">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No published results yet</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
          Report cards are generated from published marks — publish this examination's marks first.
        </p>
      </Card>
    );
  }

  const selected = rows.find((r) => r.student.id === studentId);

  return (
    <div className="space-y-5">
      <Card className="p-4 border-border/80 shadow-xs">
        <FilterSelect
          label="Select Student"
          value={studentId}
          onChange={setStudentId}
          options={[
            { value: '', label: 'Choose a student…' },
            ...rows.map((r) => ({
              value: r.student.id,
              label: `${r.student.name} (${r.student.rollNo})`,
            })),
          ]}
          className="max-w-md"
        />
      </Card>

      {selected ? (
        <ReportCard
          examName={examName}
          data={{
            studentName: selected.student.name,
            rollNo: selected.student.rollNo,
            className: selected.student.className,
            rank: selected.rank,
            marks: selected.marks,
            totalObtained: selected.totalObtained,
            totalMax: selected.totalMax,
            percentage: selected.percentage,
            grade: selected.grade,
            isPass: selected.isPass,
          }}
        />
      ) : (
        <Card className="border-border/80 shadow-xs p-12 sm:p-16 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-3.5 ring-1 ring-border/60">
            <FileText size={24} />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Select a Student</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Choose a student from the dropdown above to view their detailed report card.
          </p>
        </Card>
      )}
    </div>
  );
}
