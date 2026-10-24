import { useEffect, useMemo, useState } from 'react';
import { ClipboardText, CurrencyDollar, BookOpen, ArrowRight, Clock } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { DashboardError, DashboardLoading, DonutBreakdown, KpiRow, KpiTile, MiniStat, Panel, PanelEmpty, ProgressLine } from '../../../dashboard/components/DashboardKit';
import { TILE_FILLS } from '../../../dashboard/components/dashboardUtils';
import { usePortal } from '../../context/PortalContext';
import { studentAttendanceApi, type MyAttendanceResponse } from '../../api/attendanceApi';
import {
  portalApi, type PortalInvoicesResponse, type PortalTimetableSlot,
} from '../../api/portalApi';
import type { TabId } from '../../types';
import { Button } from '@/components/ui/button';

interface Props {
  onNavigate: (tab: TabId) => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const formatUSD = (n: number) => `$${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export default function DashboardTab({ onNavigate }: Props) {
  const { studentId } = usePortal();
  const [attendance, setAttendance] = useState<MyAttendanceResponse | null>(null);
  const [invoices, setInvoices] = useState<PortalInvoicesResponse | null>(null);
  const [timetable, setTimetable] = useState<PortalTimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [att, inv, tt] = await Promise.all([
          studentAttendanceApi.getMyAttendance(studentId),
          portalApi.getInvoices(studentId),
          portalApi.getTimetable(studentId),
        ]);
        if (cancelled) return;
        setAttendance(att); setInvoices(inv); setTimetable(tt);
        setError('');
      } catch (err) {
        if (!cancelled) { console.error(err); setError('Failed to load dashboard.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  const attendanceRate = useMemo(() => {
    const total = attendance?.total ?? 0;
    // Late counts as attended, as on the Attendance tab.
    const present = (attendance?.summary?.Present ?? 0) + (attendance?.summary?.Late ?? 0);
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }, [attendance]);

  const subjectCount = useMemo(
    () => new Set(timetable.map((s) => s.subject?._id).filter(Boolean)).size,
    [timetable],
  );

  const todaysClasses = useMemo(() => {
    const today = DAY_NAMES[new Date().getDay()];
    return timetable.filter((s) => s.day === today).sort((a, b) => (a.timePeriod || '').localeCompare(b.timePeriod || ''));
  }, [timetable]);

  if (loading) return <DashboardLoading />;
  if (error) return <DashboardError message={error} />;

  const att = attendance?.summary;
  const invoiced = invoices?.totals?.invoiced ?? 0;
  const paid = invoices?.totals?.paid ?? 0;
  const balance = invoices?.totals?.balance ?? 0;
  const paidPct = invoiced > 0 ? Math.round((paid / invoiced) * 100) : 0;
  const today = DAY_NAMES[new Date().getDay()];

  return (
    <div className="space-y-6">
      <KpiRow columns={4}>
        <KpiTile label="Attendance" value={`${attendanceRate}%`} fill="bg-tile-green" icon={ClipboardText}
          note="Present or late, all lessons" onClick={() => onNavigate('attendance')} />
        <KpiTile label="Subjects" value={subjectCount} fill="bg-tile-blue" icon={BookOpen}
          note="On your timetable" onClick={() => onNavigate('subjects')} />
        <KpiTile label="Lessons today" value={todaysClasses.length} fill="bg-tile-pink" icon={Clock}
          note={today} onClick={() => onNavigate('timetable')} />
        <KpiTile label="Outstanding fees" value={formatUSD(balance)} fill="bg-tile-yellow" icon={CurrencyDollar}
          note={balance > 0 ? 'Balance due' : 'All paid up'} onClick={() => onNavigate('fees')} />
      </KpiRow>

      <Panel title="Today's classes" description={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        action={<Button variant="ghost" size="xs" onClick={() => onNavigate('timetable')}>Timetable <ArrowRight size={13} /></Button>}>
        {todaysClasses.length === 0 ? (
          <PanelEmpty text={`No lessons on your timetable for ${today}.`} />
        ) : (
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {todaysClasses.map((s, i) => (
              <li key={s._id} className={cn('flex flex-wrap items-center justify-between gap-2 rounded-xl p-3.5 text-tile-foreground', TILE_FILLS[i % TILE_FILLS.length])}>
                <div>
                  <p className="font-semibold">{s.subject?.sub_name ?? 'Subject'}</p>
                  <p className="text-xs opacity-75">
                    {s.teacher ? `${s.teacher.firstName ?? ''} ${s.teacher.lastName ?? ''}`.trim() : '—'}
                    {s.room ? ` · ${s.room}` : ''}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium dark:bg-white/10">
                  <Clock size={12} /> {s.timePeriod || '—'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutBreakdown title="Attendance" description="Your lessons by status"
          data={[
            { name: 'Present', value: att?.Present ?? 0, color: 'hsl(var(--tile-green))' },
            { name: 'Late', value: att?.Late ?? 0, color: 'hsl(var(--tile-yellow))' },
            { name: 'Absent', value: att?.Absent ?? 0, color: 'hsl(var(--tile-pink))' },
          ]}
          centerLabel="Lessons" emptyText="No attendance recorded yet." />

        <Panel title="Fee summary" description="What has been billed and paid"
          action={<Button variant="ghost" size="xs" onClick={() => onNavigate('fees')}>Details <ArrowRight size={13} /></Button>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Billed" value={formatUSD(invoiced)} fill="bg-tile-blue" />
              <MiniStat label="Paid" value={formatUSD(paid)} fill="bg-tile-green" />
            </div>
            <ProgressLine label="Paid so far" percent={paidPct} />
            <div className="flex items-center justify-between rounded-xl bg-tile-yellow px-3.5 py-3 text-tile-foreground">
              <span className="text-sm font-medium">Balance due</span>
              <span className="text-lg font-semibold tabular-nums">{formatUSD(balance)}</span>
            </div>
          </div>
        </Panel>

      </div>
    </div>
  );
}
