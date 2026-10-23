import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CheckCircle, XCircle, Clock, Info, TrendUp, DownloadSimple, SpinnerGap } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusBadge } from '../shared';
import { downloadCSV } from '../../utils/csv';
import { studentAttendanceApi, type MyAttendanceRecord } from '../../api/attendanceApi';
import { usePortal } from '../../context/PortalContext';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const CALENDAR_CELL: Record<string, string> = {
  Present: 'bg-success text-success-foreground',
  Absent: 'bg-destructive text-destructive-foreground',
  Late: 'bg-warning/15 text-warning',
  Excused: 'bg-info text-info-foreground',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function AttendanceTab() {
  const { studentId } = usePortal();
  const [records, setRecords] = useState<MyAttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Partial<Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await studentAttendanceApi.getMyAttendance(studentId);
        if (cancelled) return;
        setRecords(data.records);
        setSummary(data.summary);
        if (data.records.length > 0) setMonth(monthKey(data.records[0].att_date));
        setError('');
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError('Failed to load attendance.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  const total = records.length;
  const present = summary.Present ?? 0;
  const absent = summary.Absent ?? 0;
  const late = summary.Late ?? 0;
  const excused = summary.Excused ?? 0;
  const overallRate = total > 0 ? Math.round((present / total) * 100) : 0;

  const monthOptions = useMemo(() => {
    const keys = Array.from(new Set(records.map((r) => monthKey(r.att_date)))).sort();
    return keys.map((k) => ({ value: k, label: monthLabel(k) }));
  }, [records]);

  const trend = useMemo(() => {
    const map: Record<string, { total: number; present: number }> = {};
    records.forEach((r) => {
      const k = monthKey(r.att_date);
      if (!map[k]) map[k] = { total: 0, present: 0 };
      map[k].total++;
      if (r.status === 'Present') map[k].present++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([k, v]) => ({ month: monthLabel(k).split(' ')[0], present: Math.round((v.present / v.total) * 100), absent: Math.round(((v.total - v.present) / v.total) * 100) }));
  }, [records]);

  const monthRecords = useMemo(
    () => records.filter((r) => monthKey(r.att_date) === month).sort((a, b) => b.att_date.localeCompare(a.att_date)),
    [records, month]
  );

  // One badge per calendar day — if multiple periods were marked that day, the worst status wins.
  const calendar = useMemo(() => {
    if (!month) return null;
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday-first
    const dayStatus: Record<number, string> = {};
    const priority = ['Absent', 'Late', 'Excused', 'Present'];
    monthRecords.forEach((r) => {
      const day = new Date(r.att_date).getUTCDate();
      const current = dayStatus[day];
      if (!current || priority.indexOf(r.status) < priority.indexOf(current)) dayStatus[day] = r.status;
    });

    const cells: { day: number; status: string }[][] = [];
    let week: { day: number; status: string }[] = new Array(firstWeekday).fill({ day: 0, status: 'none' });
    for (let day = 1; day <= daysInMonth; day++) {
      week.push({ day, status: dayStatus[day] || 'none' });
      if (week.length === 7) { cells.push(week); week = []; }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push({ day: 0, status: 'none' });
      cells.push(week);
    }
    return cells;
  }, [month, monthRecords]);

  const exportRecords = () => {
    downloadCSV(`attendance-${month}`, monthRecords.map((r) => ({
      Date: formatDate(r.att_date), Period: r.periodId?.per_name || '—', Status: r.status, Remarks: r.remarks || '',
    })));
  };

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
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-px">
          <KPICell icon={CheckCircle} iconClass="text-success" label="Present" value={String(present)} sub="Sessions attended" />
          <KPICell icon={XCircle} iconClass="text-destructive" label="Absent" value={String(absent)} sub="Sessions missed" />
          <KPICell icon={Clock} iconClass="text-warning" label="Late" value={String(late)} sub="Tardy arrivals" />
          <KPICell icon={Info} iconClass="text-info" label="Excused" value={String(excused)} sub="Excused absences" />
          <KPICell icon={TrendUp} iconClass="text-success" label="Overall %" value={`${overallRate}%`} sub="Attendance rate" />
        </div>
      </Card>

      {records.length === 0 ? (
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-0">
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <CheckCircle size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">No attendance recorded</p>
              <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
                No attendance has been recorded for you yet. Records will appear here as they are marked.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Month filter + Export */}
          <Card className="border-border/80 shadow-2xs">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="max-w-xs w-full">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Month</label>
                <NativeSelect
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full"
                >
                  {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </NativeSelect>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportRecords}
                disabled={monthRecords.length === 0}
                className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0"
              >
                <DownloadSimple size={13} /> Export CSV
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend Chart */}
            <Card className="border-border/80 shadow-2xs">
              <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="text-base font-semibold text-foreground">Monthly Trend</CardTitle>
                <CardDescription className="text-xs mt-0.5">Attendance percentage over last 6 months</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, '']} />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(v) => (v === 'present' ? 'Present %' : 'Absent %')}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="present" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="absent" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Calendar */}
            <Card className="border-border/80 shadow-2xs">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-foreground">{monthLabel(month)}</CardTitle>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <LegendDot color="bg-success" label="Present" />
                    <LegendDot color="bg-destructive" label="Absent" />
                    <LegendDot color="bg-warning/80" label="Late" />
                    <LegendDot color="bg-info" label="Excused" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {!calendar ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">Calendar view isn't available yet.</div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground mb-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}
                    </div>
                    <div className="space-y-1.5">
                      {calendar.map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7 gap-1.5">
                          {week.map((cell, ci) => (
                            <div
                              key={ci}
                              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold ${
                                cell.status === 'none' ? 'invisible' : (CALENDAR_CELL[cell.status] || 'bg-muted text-muted-foreground')
                              }`}
                            >
                              {cell.status !== 'none' ? cell.day : ''}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Records Table */}
          <Card className="border-border/80 shadow-2xs">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base font-semibold text-foreground">Attendance Records</CardTitle>
              <CardDescription className="text-xs mt-0.5">Detailed per-period history · {monthLabel(month)}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {monthRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No attendance sessions recorded for this month.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full min-w-[560px]">
                    <TableHeader>
                      <TableRow className="border-b border-border/60">
                        <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</TableHead>
                        <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Period</TableHead>
                        <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthRecords.map((r) => (
                        <TableRow key={r._id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                          <TableCell className="px-5 py-3 text-sm text-foreground">{formatDate(r.att_date)}</TableCell>
                          <TableCell className="px-5 py-3 text-sm font-medium text-primary">{r.periodId?.per_name || '—'}</TableCell>
                          <TableCell className="px-5 py-3"><StatusBadge status={r.status} /></TableCell>
                          <TableCell className="px-5 py-3 text-sm text-muted-foreground">{r.remarks || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
