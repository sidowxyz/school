import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle, DownloadSimple, MagnifyingGlass, SpinnerGap, UsersThree } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MonthPicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatStrip from '@/components/shared/StatStrip';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { downloadCSV } from '../../reports/utils/csv';
import { attendanceService, type StaffMonthlyReport } from '../../../services/attendance.service';
import { rateTone } from '../../attendance/statusStyles';

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function StaffMonthlyReportTab() {
  const [month, setMonth] = useState(thisMonth());
  const [q, setQ] = useState('');
  const [report, setReport] = useState<StaffMonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const [year, m] = month.split('-');
    let cancelled = false;
    setLoading(true);
    attendanceService.getStaffMonthlyReport({ year, month: String(Number(m)) })
      .then((r) => { if (!cancelled) { setReport(r); setError(null); } })
      .catch(() => { if (!cancelled) setError('Could not load the report.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (report?.staffReports ?? []).slice().sort((a, b) => a.staff.name.localeCompare(b.staff.name));
    return term ? list.filter((r) => `${r.staff.name} ${r.staff.stf_no} ${r.staff.department}`.toLowerCase().includes(term)) : list;
  }, [report, q]);

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const s = report?.summary;
  const absences = (report?.staffReports ?? []).reduce((n, r) => n + r.stats.absent, 0);

  const exportCsv = () => downloadCSV(`staff-attendance-${month}`, rows.map((r) => ({
    Name: r.staff.name,
    'Staff ID': r.staff.stf_no,
    Department: r.staff.department,
    Days: r.stats.totalDays,
    Present: r.stats.present,
    Late: r.stats.late,
    Absent: r.stats.absent,
    Leave: r.stats.excused,
    'Attendance %': r.stats.totalDays ? r.stats.presentRate : '',
  })));

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/70 shadow-none">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="sr-month" className="text-xs">Month</Label>
            <MonthPicker id="sr-month" value={month} max={thisMonth()} onChange={(v) => v && setMonth(v)} className="w-48" />
          </div>
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a staff member" className="pl-8" aria-label="Find a staff member" />
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length} className="ml-auto">
            <DownloadSimple size={15} /> Download CSV
          </Button>
        </CardContent>
      </Card>

      {s && (
        <StatStrip items={[
          { label: 'Average attendance', value: s.totalWorkingDaysRecorded ? `${s.overallPresentRate}%` : '—', icon: CheckCircle, tone: 'emerald', hint: monthLabel },
          { label: 'Staff', value: s.totalStaff, icon: UsersThree, tone: 'sky', hint: `${absences} absence${absences === 1 ? '' : 's'} this month` },
          { label: 'Days recorded', value: s.totalWorkingDaysRecorded, icon: CalendarCheck, tone: 'violet', hint: 'One per staff member per day' },
        ]} />
      )}

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-none">
        {loading && !report ? (
          <div className="flex justify-center py-16"><SpinnerGap size={24} className="animate-spin text-primary" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={UsersThree} text="No staff match." />
        ) : (
          <div className={cn('overflow-x-auto', loading && 'opacity-60')}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-4">Staff member</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-right">Late</TableHead>
                  <TableHead className="text-right">Absent</TableHead>
                  <TableHead className="text-right">Leave</TableHead>
                  <TableHead className="w-44 pr-4 text-right">Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.staff._id}>
                    <TableCell className="pl-4">
                      <p className="font-medium">{r.staff.name}</p>
                      <p className="text-xs text-muted-foreground">{r.staff.stf_no}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.staff.department === 'N/A' ? '—' : r.staff.department}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.stats.present}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.stats.late}</TableCell>
                    <TableCell className={cn('text-right tabular-nums', r.stats.absent > 0 && 'font-semibold text-destructive')}>{r.stats.absent}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.stats.excused}</TableCell>
                    <TableCell className="pr-4">
                      {r.stats.totalDays ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block">
                            <div className={cn('h-full rounded-full', r.stats.presentRate >= 90 ? 'bg-success' : r.stats.presentRate >= 75 ? 'bg-warning' : 'bg-destructive')} style={{ width: `${r.stats.presentRate}%` }} />
                          </div>
                          <span className={cn('w-12 text-right text-sm font-semibold tabular-nums', rateTone(r.stats.presentRate))}>{Math.round(r.stats.presentRate)}%</span>
                        </div>
                      ) : (
                        <p className="text-right text-xs text-muted-foreground">No marks</p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
