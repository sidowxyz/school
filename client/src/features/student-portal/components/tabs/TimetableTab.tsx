import { useEffect, useMemo, useState } from 'react';
import { SpinnerGap, CalendarBlank, BookOpen, Clock, MapPin, User } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { portalApi, type PortalTimetableSlot } from '../../api/portalApi';
import { usePortal } from '../../context/PortalContext';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetableTab() {
  const { studentId } = usePortal();
  const [slots, setSlots] = useState<PortalTimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await portalApi.getTimetable(studentId);
        if (!cancelled) { setSlots(data); setError(''); }
      } catch (err) {
        if (!cancelled) { console.error(err); setError('Failed to load timetable.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  const byDay = useMemo(() => {
    const map: Record<string, PortalTimetableSlot[]> = {};
    for (const s of slots) {
      (map[s.day] ??= []).push(s);
    }
    for (const d of Object.keys(map)) {
      map[d].sort((a, b) => (a.timePeriod || '').localeCompare(b.timePeriod || ''));
    }
    return map;
  }, [slots]);

  const teacherName = (t: PortalTimetableSlot['teacher']) =>
    t ? `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || '—' : '—';

  const subjectCount = useMemo(
    () => new Set(slots.map((s) => s.subject?._id).Funnel(Boolean)).size,
    [slots],
  );
  const activeDays = DAY_ORDER.Funnel((d) => byDay[d]?.length);

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-primary" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-destructive text-sm">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Hairline Divided KPI Strip */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px">
          <KPICell icon={CalendarBlank} iconClass="text-emerald-600 dark:text-emerald-400" label="Weekly Classes" value={String(slots.length)} sub="Total scheduled periods" />
          <KPICell icon={BookOpen} iconClass="text-sky-600 dark:text-sky-400" label="Subjects" value={String(subjectCount)} sub="Unique courses" />
          <KPICell icon={Clock} iconClass="text-amber-600 dark:text-amber-400" label="School Days" value={String(activeDays.length)} sub="Active weekdays" />
        </div>
      </Card>

      {/* Timetable by Day */}
      {slots.length === 0 ? (
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-0">
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <CalendarBlank size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">No timetable set</p>
              <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
                No timetable has been set for this class yet. Check back once your schedule is published.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {activeDays.map((day) => (
            <Card key={day} className="border-border/80 shadow-2xs">
              <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="text-base font-semibold text-foreground">{day}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{byDay[day].length} period{byDay[day].length === 1 ? '' : 's'} scheduled</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {byDay[day].map((s) => (
                    <div key={s._id} className="rounded-xl border border-border/70 bg-card p-4 hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Clock size={13} /> {s.timePeriod || '—'}
                      </div>
                      <p className="mt-2 font-semibold text-foreground">{s.subject?.sub_name ?? 'Subject'}</p>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p className="flex items-center gap-1.5"><User size={12} className="text-muted-foreground" /> {teacherName(s.teacher)}</p>
                        {s.room && <p className="flex items-center gap-1.5"><MapPin size={12} className="text-muted-foreground" /> {s.room}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── KPI Strip Cell ─── */
function KPICell({ icon: Icon, iconClass, label, value, sub }: { icon: React.ElementType; iconClass: string; label: string; value: string; sub: string }) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon size={15} className={iconClass} />
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
