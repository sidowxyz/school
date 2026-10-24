import type { Student } from '../../students/types';
import { fullName, initialsOf, classSectionLabel } from '../utils/portalStudent';
import { GraduationCap, ShieldCheck } from '@phosphor-icons/react';

interface Props {
  student: Student | null;
}

/** The profile hero at the top of the portal: a pastel card with the student's name, ID and class. */
export default function ProfileContextBanner({ student }: Props) {
  if (!student) {
    return (
      <div className="rounded-2xl bg-tile-green p-5 print:hidden sm:p-6">
        <div className="flex animate-pulse items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/50" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-white/50" />
            <div className="h-3.5 w-56 rounded bg-white/40" />
          </div>
        </div>
      </div>
    );
  }

  const isStatusActive = student.status?.toLowerCase() === 'active';

  return (
    <div className="rounded-2xl bg-tile-green p-5 text-tile-foreground print:hidden sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-xl font-bold dark:bg-white/10">
            {initialsOf(student)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">{fullName(student)}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold dark:bg-white/10">
                <span className={`h-1.5 w-1.5 rounded-full ${isStatusActive ? 'bg-success' : 'bg-warning'}`} />
                {student.status || 'Active'}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-80">
              <span className="font-mono font-medium">{student.admissionNumber}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <GraduationCap size={13} />
                {classSectionLabel(student)}
              </span>
            </p>
          </div>
        </div>

        {student.status && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold dark:bg-white/10">
            <ShieldCheck size={14} weight="bold" />
            {student.status} student
          </span>
        )}
      </div>
    </div>
  );
}
