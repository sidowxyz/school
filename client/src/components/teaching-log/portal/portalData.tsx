import { CaretDown } from '@phosphor-icons/react';
import type { TeacherAssignment, TimetableSlot } from '@/features/teachers/types';
import { NativeSelect } from '@/components/ui/native-select';

export interface TeachingSession {
  key: string;
  assignmentId: string;
  periodId: string;
  assignment: TeacherAssignment;
  slot: TimetableSlot;
}

export function weekdayForDate(date: string): TimetableSlot['day'] | '' {
  if (!date) return '';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { weekday: 'long' }) as TimetableSlot['day'];
}

export function periodLabel(slot: TimetableSlot): string {
  const period = slot.periodId;
  return `${period.per_name} (${period.time_in} - ${period.time_out})`;
}

export function classLabel(assignment: TeacherAssignment): string {
  const className = assignment.classId?.cl_name || 'Unnamed class';
  return assignment.sectionId?.name ? `${className} - ${assignment.sectionId.name}` : className;
}

/**
 * Builds the selectable sessions exclusively from the logged-in teacher's
 * populated timetable. No fixed period/class values are introduced here.
 */
export function teachingSessionsForDate(
  assignments: TeacherAssignment[],
  date: string,
): TeachingSession[] {
  const weekday = weekdayForDate(date);
  if (!weekday) return [];

  return assignments
    .flatMap((assignment) => assignment.timetableSlots
      .filter((slot) => slot.day === weekday && Boolean(slot.periodId?._id))
      .map((slot) => ({
        key: `${assignment._id}:${slot.periodId._id}`,
        assignmentId: assignment._id,
        periodId: slot.periodId._id,
        assignment,
        slot,
      })))
    .sort((a, b) => a.slot.periodId.time_in.localeCompare(b.slot.periodId.time_in));
}

export function teachingSessionLabel(session: TeachingSession): string {
  return `${periodLabel(session.slot)} · ${classLabel(session.assignment)} · ${session.assignment.subjectId?.sub_name || 'Unnamed subject'}`;
}

// Reusable select
export function Select({
  label, value, onChange, placeholder, options, disabled = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-1.5">{label}</label>
      <div className="relative">
        <NativeSelect
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:bg-muted/50 disabled:cursor-not-allowed ${
            value ? 'text-foreground/80' : 'text-muted-foreground'
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </NativeSelect>
        <CaretDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}
