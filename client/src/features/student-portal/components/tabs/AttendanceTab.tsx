import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, DownloadSimple, TrendUp, XCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import StatStrip from '@/components/shared/StatStrip';
import { cn } from '@/lib/utils';
import { DashboardError, DashboardLoading, Panel, PanelEmpty } from '../../../dashboard/components/DashboardKit';
import { downloadCSV } from '../../utils/csv';
import { studentAttendanceApi, type MyAttendanceRecord } from '../../api/attendanceApi';
import { usePortal } from '../../context/PortalContext';

// Day colours match the rest of the app's attendance screens.
const DAY_FILL: Record<string, string> = {
  Present: 'bg-tile-green text-tile-foreground',
  Late: 'bg-tile-yellow text-tile-foreground',
  Absent: 'bg-tile-pink text-tile-foreground',
  Excused: 'bg-tile-blue text-tile-foreground',
};
const PILL: Record<string, string> = {
  Present: 'bg-success/10 text-success',
  Late: 'bg-warning/10 text-warning',
  Absent: 'bg-destructive/10 text-destructive',
  Excused: 'bg-info/10 text-info',
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export default function AttendanceTab() {
  const { studentId } = usePortal();
  const [records, setRecords] = useState<MyAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    studentAttendanceApi.getMyAttendance(studentId)
      .then((data) => {
        if (cancelled) return;
        setRecords(data.records);
        if (data.records.length > 0) setMonth(monthKey(data.records[0].att_date));
        setError('');
      })
      .catch(() => { if (!cancelled) setError('Could not load your attendance.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  const months = useMemo(() => [...new Set(records.map((r) => monthKey(r.att_date)))].sort().reverse(), [records]);
  const monthRecords = useMemo(
    () => records.filter((r) => monthKey(r.att_date) === month).sort((a, b) => b.att_date.localeCompare(a.att_date)),
    [records, month],
  );

  // One square per school day; if several lessons were marked, the worst status wins.
  const calendar = useMemo(() => {
    if (!month) return [];
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstWeekday = (new Date(y, m - 1, 1).getDay() + 1) % 7; // Saturday-first week
    const worst = ['Absent', 'Late', 'Excused', 'Present'];
    const status: Record<number, string> = {};
    for (const r of monthRecords) {
      const day = new Date(r.att_date).getUTCDate();
      if (!status[day] || worst.indexOf(r.status) < worst.indexOf(status[day])) status[day] = r.status;
    }
    return [
      ...Array.from({ length: firstWeekday }, () => ({ day: 0, status: '' })),
      ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, status: status[i + 1] ?? '' })),
    ];
  }, [month, monthRecords]);

  if (loading) return <DashboardLoading />;
  if (error) return <DashboardError message={error} />;

  const count = (list: MyAttendanceRecord[], s: string) => list.filter((r) => r.status === s).length;
  const total = records.length;
  const attended = count(records, 'Present') + count(records, 'Late');
  const rate = total ? Math.round((attended / total) * 100) : 0;

  const exportCsv = () => downloadCSV(`attendance-${month}`, monthRecords.map((r) => ({
    Date: formatDate(r.att_date), Lesson: r.periodId?.per_name ?? '', Status: r.status, Note: r.remarks ?? '',
  })));

  return (
    <div className="space-y-6">
      <StatStrip items={[
        { label: 'Attendance', value: total ? `${rate}%` : '—', icon: TrendUp, tone: 'emerald', hint: 'Present or late' },
        { label: 'Present', value: count(records, 'Present'), icon: CheckCircle, tone: 'sky', hint: 'Lessons attended' },
        { label: 'Late', value: count(records, 'Late'), icon: Clock, tone: 'amber', hint: 'Arrived late' },
        { label: 'Absent', value: count(records, 'Absent'), icon: XCircle, tone: 'rose', hint: count(records, 'Excused') ? `${count(records, 'Excused')} excused` : 'Lessons missed' },
      ]} />

      {total === 0 ? (
        <Panel title="My attendance"><PanelEmpty text="No attendance has been recorded for you yet." /></Panel>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Panel title={monthLabel(month)} description="Each school day"
            action={
              <NativeSelect value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 w-36 text-xs" aria-label="Month">
                {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </NativeSelect>
            }>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted-foreground">
              {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => <div key={d}>{d}</div>)}
              {calendar.map((c, i) => (
                <div key={i} className={cn('flex aspect-square items-center justify-center rounded-lg text-xs font-semibold',
                  c.day === 0 ? '' : c.status ? DAY_FILL[c.status] : 'bg-muted/60 text-muted-foreground')}>
                  {c.day || ''}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              {Object.entries(DAY_FILL).map(([s, cls]) => (
                <span key={s} className="flex items-center gap-1.5"><span className={cn('h-2.5 w-2.5 rounded-sm', cls)} />{s}</span>
              ))}
            </div>
          </Panel>

          <Panel title="Lessons" description={`${monthRecords.length} marked in ${monthLabel(month)}`} flush
            action={<Button variant="outline" size="sm" onClick={exportCsv} disabled={!monthRecords.length} className="h-8 gap-1.5"><DownloadSimple size={13} /> CSV</Button>}>
            {monthRecords.length === 0 ? (
              <PanelEmpty text="Nothing recorded this month." />
            ) : (
              <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
                {monthRecords.map((r) => (
                  <li key={r._id} className="flex items-center justify-between gap-3 px-6 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{formatDate(r.att_date)}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.periodId?.per_name ?? 'Lesson'}{r.remarks ? ` · ${r.remarks}` : ''}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', PILL[r.status])}>{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
