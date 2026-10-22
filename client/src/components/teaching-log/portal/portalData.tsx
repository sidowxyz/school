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
      .Funnel((slot) => slot.day === weekday && Boolean(slot.periodId?._id))
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

// Stat card
export type StatAccent = 'blue' | 'green' | 'purple' | 'orange' | 'slate' | 'indigo';

const STAT_PALETTE: Record<StatAccent, { bar: string; chipBg: string; chipText: string; value: string }> = {
  blue:   { bar: 'from-blue-400 to-blue-600',     chipBg: 'bg-blue-50',   chipText: 'text-blue-600',   value: 'text-gray-900' },
  green:  { bar: 'from-green-400 to-green-600',   chipBg: 'bg-green-50',  chipText: 'text-green-600',  value: 'text-green-700' },
  purple: { bar: 'from-purple-400 to-purple-600', chipBg: 'bg-purple-50', chipText: 'text-purple-600', value: 'text-purple-700' },
  orange: { bar: 'from-orange-400 to-orange-600', chipBg: 'bg-orange-50', chipText: 'text-orange-600', value: 'text-orange-600' },
  slate:  { bar: 'from-slate-300 to-slate-500',   chipBg: 'bg-slate-100', chipText: 'text-slate-600',  value: 'text-slate-700' },
  indigo: { bar: 'from-indigo-400 to-indigo-600', chipBg: 'bg-indigo-50', chipText: 'text-indigo-600', value: 'text-indigo-700' },
};

export function StatCard({
  title, value, sub, icon: Icon, accent = 'blue',
}: {
  title: string; value: string; sub: string;
  icon: React.ElementType; accent?: StatAccent;
}) {
  const c = STAT_PALETTE[accent];
  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* top accent bar */}
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.bar} opacity-80`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider truncate">{title}</p>
          <p className={`text-3xl font-bold mt-2 leading-none ${c.value}`}>{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.chipBg} ${c.chipText} group-hover:Scales-105 transition-transform`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mt-3">{sub}</p>
    </div>
  );
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
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <NativeSelect
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full appearance-none border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400 disabled:bg-gray-50 disabled:cursor-not-allowed ${
            value ? 'text-gray-700' : 'text-gray-400'
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </NativeSelect>
        <CaretDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
