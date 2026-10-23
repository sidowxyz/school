import { BookOpen, ChalkboardTeacher, Clock } from '@phosphor-icons/react';
import StatStrip from '@/components/shared/StatStrip';
import { cn } from '@/lib/utils';
import { DashboardError, DashboardLoading, Panel, PanelEmpty } from '../../../dashboard/components/DashboardKit';
import { TILE_FILLS } from '../../../dashboard/components/dashboardUtils';
import { portalApi, type PortalTimetableSlot } from '../../api/portalApi';
import { usePortalResource } from '../../hooks/usePortalResource';

interface SubjectRow { id: string; name: string; teacher: string; periods: number }

const teacherName = (t: PortalTimetableSlot['teacher']) =>
  t ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || '—' : '—';

// Subjects come from the class timetable: one row per subject, with its
// teacher and how many lessons a week it has.
function deriveSubjects(slots: PortalTimetableSlot[]): SubjectRow[] {
  const map = new Map<string, SubjectRow>();
  for (const s of slots) {
    const id = s.subject?._id;
    if (!id) continue;
    const existing = map.get(id);
    if (existing) existing.periods += 1;
    else map.set(id, { id, name: s.subject?.sub_name ?? 'Subject', teacher: teacherName(s.teacher), periods: 1 });
  }
  return [...map.values()].sort((a, b) => b.periods - a.periods || a.name.localeCompare(b.name));
}

export default function SubjectsTab() {
  const { data, loading, error } = usePortalResource(portalApi.getTimetable);

  if (loading) return <DashboardLoading />;
  if (error) return <DashboardError message={error} />;

  const subjects = deriveSubjects(data ?? []);
  const teachers = new Set(subjects.map((s) => s.teacher).filter((t) => t !== '—')).size;

  return (
    <div className="space-y-6">
      <StatStrip items={[
        { label: 'Subjects', value: subjects.length, icon: BookOpen, tone: 'sky', hint: 'This term' },
        { label: 'Lessons a week', value: (data ?? []).length, icon: Clock, tone: 'amber', hint: 'Across all subjects' },
        { label: 'Teachers', value: teachers, icon: ChalkboardTeacher, tone: 'violet', hint: 'Who teach your class' },
      ]} />

      <Panel title="My subjects" description="Each subject, its teacher and lessons per week">
        {subjects.length === 0 ? (
          <PanelEmpty text="No subjects are scheduled for your class yet." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {subjects.map((s, i) => (
              <div key={s.id} className={cn('rounded-2xl p-4 text-tile-foreground', TILE_FILLS[i % TILE_FILLS.length])}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{s.name}</p>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 dark:bg-white/10"><BookOpen size={15} /></span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm opacity-80"><ChalkboardTeacher size={14} /> {s.teacher}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm opacity-80"><Clock size={14} /> {s.periods} lesson{s.periods === 1 ? '' : 's'} a week</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
