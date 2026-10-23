import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarBlank, Clock, MapPin } from '@phosphor-icons/react';
import StatStrip from '@/components/shared/StatStrip';
import { cn } from '@/lib/utils';
import { DashboardError, DashboardLoading, Panel, PanelEmpty } from '../../../dashboard/components/DashboardKit';
import { portalApi, type PortalTimetableSlot } from '../../api/portalApi';
import { usePortal } from '../../context/PortalContext';

// Somali school week — Saturday first.
const DAY_ORDER = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FILLS = ['bg-tile-blue', 'bg-tile-green', 'bg-tile-yellow', 'bg-tile-pink', 'bg-tile-violet'];

const teacherName = (t: PortalTimetableSlot['teacher']) =>
  t ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || '—' : '—';

export default function TimetableTab() {
  const { studentId } = usePortal();
  const [slots, setSlots] = useState<PortalTimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    portalApi.getTimetable(studentId)
      .then((data) => { if (!cancelled) { setSlots(data); setError(''); } })
      .catch(() => { if (!cancelled) setError('Could not load your timetable.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  const byDay = useMemo(() => {
    const map: Record<string, PortalTimetableSlot[]> = {};
    for (const s of slots) (map[s.day] ??= []).push(s);
    for (const d of Object.keys(map)) map[d].sort((a, b) => (a.timePeriod || '').localeCompare(b.timePeriod || ''));
    return map;
  }, [slots]);

  // Each subject keeps one colour across the whole week.
  const fillFor = useMemo(() => {
    const names = [...new Set(slots.map((s) => s.subject?.sub_name ?? ''))].sort();
    const map = new Map(names.map((n, i) => [n, FILLS[i % FILLS.length]]));
    return (name?: string) => map.get(name ?? '') ?? FILLS[0];
  }, [slots]);

  if (loading) return <DashboardLoading />;
  if (error) return <DashboardError message={error} />;

  const days = DAY_ORDER.filter((d) => byDay[d]?.length);
  const today = DAY_NAMES[new Date().getDay()];
  const subjectCount = new Set(slots.map((s) => s.subject?._id).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <StatStrip items={[
        { label: 'Lessons a week', value: slots.length, icon: CalendarBlank, tone: 'sky', hint: 'All scheduled lessons' },
        { label: 'Subjects', value: subjectCount, icon: BookOpen, tone: 'violet', hint: 'Different subjects' },
        { label: 'Today', value: byDay[today]?.length ?? 0, icon: Clock, tone: 'emerald', hint: byDay[today]?.length ? `Lessons on ${today}` : `No lessons on ${today}` },
      ]} />

      {slots.length === 0 ? (
        <Panel title="My week"><PanelEmpty text="Your class timetable hasn't been published yet." /></Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {days.map((day) => (
            <Panel key={day} title={day} description={`${byDay[day].length} lesson${byDay[day].length === 1 ? '' : 's'}`}
              className={cn(day === today && 'ring-2 ring-primary/40')}
              action={day === today ? <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Today</span> : undefined}>
              <div className="space-y-2">
                {byDay[day].map((s) => (
                  <div key={s._id} className={cn('rounded-xl px-3.5 py-2.5 text-tile-foreground', fillFor(s.subject?.sub_name))}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{s.subject?.sub_name ?? 'Subject'}</p>
                      <span className="flex shrink-0 items-center gap-1 text-xs opacity-80"><Clock size={12} /> {s.timePeriod || '—'}</span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-2 truncate text-xs opacity-75">
                      {teacherName(s.teacher)}
                      {s.room && <span className="flex items-center gap-0.5"><MapPin size={11} /> {s.room}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
