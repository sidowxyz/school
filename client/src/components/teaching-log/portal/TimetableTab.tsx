import { useMemo, useState } from 'react';
import { SpinnerGap, CalendarBlank, Clock } from '@phosphor-icons/react';
import type { TeacherAssignment, Weekday } from '@/features/teachers/types';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/common/EmptyState';

const DAYS: Weekday[] = [
  'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
];

const BADGE_COLORS = [
  'bg-info/15 text-info',
  'bg-primary/15 text-primary',
  'bg-violet/15 text-violet',
  'bg-warning/15 text-warning',
  'bg-violet/15 text-violet',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-info/15 text-info',
  'bg-info/15 text-info',
];

function badgeColor(key: string) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  return BADGE_COLORS[Math.abs(hash) % BADGE_COLORS.length];
}

interface TimetableTabProps {
  assignments: TeacherAssignment[];
  loading?: boolean;
}

export default function TimetableTab({ assignments, loading = false }: TimetableTabProps) {
  const [termId, setTermId] = useState('all');
  const [sectionId, setSectionId] = useState('all');

  const terms = useMemo(() => {
    const map = new Map<string, TeacherAssignment['termId']>();
    assignments.forEach((assignment) => {
      if (assignment.termId?._id) map.set(assignment.termId._id, assignment.termId);
    });
    return Array.from(map.values());
  }, [assignments]);

  const termAssignments = useMemo(
    () => termId === 'all'
      ? assignments
      : assignments.filter((assignment) => assignment.termId?._id === termId),
    [assignments, termId],
  );

  const sections = useMemo(() => {
    const map = new Map<string, TeacherAssignment['sectionId']>();
    termAssignments.forEach((assignment) => {
      if (assignment.sectionId?._id) map.set(assignment.sectionId._id, assignment.sectionId);
    });
    return Array.from(map.values());
  }, [termAssignments]);

  const filteredAssignments = useMemo(
    () => sectionId === 'all'
      ? termAssignments
      : termAssignments.filter((assignment) => assignment.sectionId?._id === sectionId),
    [sectionId, termAssignments],
  );

  const periods = useMemo(() => {
    const map = new Map<string, TeacherAssignment['timetableSlots'][number]['periodId']>();
    filteredAssignments.forEach((assignment) => {
      assignment.timetableSlots.forEach((slot) => {
        if (slot.periodId?._id) map.set(slot.periodId._id, slot.periodId);
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      const byTime = a.time_in.localeCompare(b.time_in);
      return byTime || a.per_no.localeCompare(b.per_no, undefined, { numeric: true });
    });
  }, [filteredAssignments]);

  const cellFor = (day: Weekday, periodId: string) => filteredAssignments.find(
    (assignment) => assignment.timetableSlots.some(
      (slot) => slot.day === day && slot.periodId?._id === periodId,
    ),
  );

  const handleTermChange = (value: string) => {
    setTermId(value);
    setSectionId('all');
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b bg-muted/50 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold text-foreground">My Weekly Timetable</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your assigned subjects, classes, and scheduled periods</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <NativeSelect
            title="Term"
            value={termId}
            onChange={(event) => handleTermChange(event.target.value)}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All Terms</option>
            {terms.map((term) => <option key={term._id} value={term._id}>{term.name}</option>)}
          </NativeSelect>
          <NativeSelect
            title="Section"
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground/80 outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All Sections</option>
            {sections.map((section) => <option key={section._id} value={section._id}>{section.name}</option>)}
          </NativeSelect>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-8 border-b px-5 py-4">
        <div><p className="text-xs text-muted-foreground">Periods</p><p className="font-semibold text-foreground">{periods.length}</p></div>
        <div><p className="text-xs text-muted-foreground">Assignments</p><p className="font-semibold text-foreground">{filteredAssignments.length}</p></div>
        {termId !== 'all' && <div><p className="text-xs text-muted-foreground">Term</p><p className="font-semibold text-foreground">{terms.find((term) => term._id === termId)?.name}</p></div>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <SpinnerGap size={19} className="animate-spin text-primary" /> Loading your timetable...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <EmptyState icon={CalendarBlank} tint="blue" title="No lessons on your timetable" text="Your periods show here once the academic office builds the timetable." />
      ) : periods.length === 0 ? (
        <EmptyState icon={Clock} tint="yellow" title="No periods scheduled" text="The school day's periods haven't been set up for this term yet." />
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full min-w-[1180px]">
            <TableHeader>
              <TableRow className="bg-primary text-primary-foreground">
                <TableHead className="min-w-[150px] p-4 text-left">Period</TableHead>
                {DAYS.map((day) => <TableHead key={day} className="min-w-[145px] p-4 text-left">{day}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period) => (
                <TableRow key={period._id} className="border-t">
                  <TableCell className="whitespace-nowrap bg-muted/50 p-4">
                    <p className="font-semibold text-foreground">{period.per_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{period.time_in} - {period.time_out}</p>
                  </TableCell>
                  {DAYS.map((day) => {
                    const assignment = cellFor(day, period._id);
                    if (!assignment) {
                      return <TableCell key={`${day}-${period._id}`} className="p-2"><div className="flex min-h-[78px] items-center justify-center rounded-lg bg-muted/50 text-muted-foreground/70">—</div></TableCell>;
                    }
                    return (
                      <TableCell key={`${day}-${period._id}`} className="p-2">
                        <div className={`min-h-[78px] rounded-lg p-3 ${badgeColor(assignment.subjectId?.sub_name || '')}`}>
                          <p className="text-sm font-semibold">{assignment.subjectId?.sub_name || '—'}</p>
                          <p className="mt-1 text-xs">{assignment.classId?.cl_name || '—'} · {assignment.sectionId?.name || '—'}</p>
                          <p className="mt-2 text-[11px] opacity-70">{period.time_in} - {period.time_out}</p>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredAssignments.length > 0 && (
        <div className="border-t bg-muted/50 px-5 py-3 text-xs text-muted-foreground">
          Showing only this teacher's assigned timetable.
        </div>
      )}
    </div>
  );
}
