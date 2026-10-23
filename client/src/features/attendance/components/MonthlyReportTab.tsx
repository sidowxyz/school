import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle, DownloadSimple, MagnifyingGlass, SpinnerGap, UsersThree } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatStrip from '@/components/shared/StatStrip';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { downloadCSV } from '../../reports/utils/csv';
import { attendanceService, sectionClassId, type ClassData, type MonthlyReport, type SectionData } from '../../../services/attendance.service';
import { rateTone } from '../statusStyles';

type Show = 'all' | 'below';

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function MonthlyReportTab({ classes, sections }: { classes: ClassData[]; sections: SectionData[] }) {
  const [month, setMonth] = useState(thisMonth());
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [q, setQ] = useState('');
  const [show, setShow] = useState<Show>('all');
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classSections = sections.filter((s) => sectionClassId(s) === classId);

  useEffect(() => {
    const [year, m] = month.split('-');
    let cancelled = false;
    setLoading(true);
    attendanceService.getStudentMonthlyReport({ year, month: String(Number(m)), classId: classId || undefined, sectionId: sectionId || undefined })
      .then((r) => { if (!cancelled) { setReport(r); setError(null); } })
      .catch(() => { if (!cancelled) setError('Could not load the report.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, classId, sectionId]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (report?.studentReports ?? []).filter((r) => {
      const name = `${r.student.firstName} ${r.student.lastName} ${r.student.admissionNumber}`.toLowerCase();
      if (term && !name.includes(term)) return false;
      if (show === 'below') return r.stats.totalDays > 0 && r.stats.presentRate < 75;
      return true;
    });
  }, [report, q, show]);

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const s = report?.summary;
  const belowCount = (report?.studentReports ?? []).filter((r) => r.stats.totalDays > 0 && r.stats.presentRate < 75).length;

  const exportCsv = () => downloadCSV(`attendance-${month}`, rows.map((r) => ({
    Student: `${r.student.firstName} ${r.student.lastName}`,
    'Admission No.': r.student.admissionNumber,
    Class: r.student.class?.cl_name ?? '',
    Section: r.student.section?.name ?? '',
    Marks: r.stats.totalDays,
    Present: r.stats.present,
    Absent: r.stats.absent,
    Late: r.stats.late,
    Excused: r.stats.excused,
    'Present %': r.stats.totalDays ? r.stats.presentRate : '',
  })));

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/70 shadow-none">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="mr-month" className="text-xs">Month</Label>
            <Input id="mr-month" type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-44" />
          </div>
          <div className="min-w-[160px] space-y-1.5">
            <Label htmlFor="mr-class" className="text-xs">Class</Label>
            <NativeSelect id="mr-class" value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }}>
              <option value="">All classes</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.cl_name}</option>)}
            </NativeSelect>
          </div>
          {classSections.length > 0 && (
            <div className="min-w-[140px] space-y-1.5">
              <Label htmlFor="mr-section" className="text-xs">Section</Label>
              <NativeSelect id="mr-section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">All sections</option>
                {classSections.map((sec) => <option key={sec._id} value={sec._id}>{sec.name}</option>)}
              </NativeSelect>
            </div>
          )}
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length} className="ml-auto gap-2">
            <DownloadSimple size={15} /> Download CSV
          </Button>
        </CardContent>
      </Card>

      {s && (
        <StatStrip items={[
          { label: 'Average attendance', value: s.totalWorkingDaysRecorded ? `${s.overallPresentRate}%` : '—', icon: CheckCircle, tone: 'emerald', hint: monthLabel },
          { label: 'Students', value: s.totalStudents, icon: UsersThree, tone: 'sky', hint: belowCount ? `${belowCount} below 75%` : 'None below 75%' },
          { label: 'Marks recorded', value: s.totalWorkingDaysRecorded, icon: CalendarCheck, tone: 'violet', hint: 'One per student per period' },
        ]} />
      )}

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a student" className="h-9 pl-8" aria-label="Find a student" />
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
            {([['all', 'All students'], ['below', 'Below 75%']] as [Show, string][]).map(([v, label]) => (
              <Button key={v} variant="plain" type="button" onClick={() => setShow(v)}
                className={cn('rounded-md px-3 py-1 font-medium', show === v ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}>
                {label}
              </Button>
            ))}
          </div>
        </div>

        {loading && !report ? (
          <div className="flex justify-center py-16"><SpinnerGap size={24} className="animate-spin text-primary" /></div>
        ) : error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <EmptyState icon={UsersThree} text={show === 'below' ? 'Nobody is below 75% this month.' : 'No students match.'} />
        ) : (
          <div className={cn('overflow-x-auto', loading && 'opacity-60')}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-4">Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-right">Absent</TableHead>
                  <TableHead className="text-right">Late</TableHead>
                  <TableHead className="text-right">Excused</TableHead>
                  <TableHead className="w-44 pr-4 text-right">Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const has = r.stats.totalDays > 0;
                  return (
                    <TableRow key={r.student._id}>
                      <TableCell className="pl-4">
                        <p className="font-medium">{r.student.firstName} {r.student.lastName}</p>
                        <p className="text-xs text-muted-foreground">{r.student.admissionNumber}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.student.class?.cl_name ?? '—'}{r.student.section?.name ? ` · ${r.student.section.name}` : ''}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.stats.present}</TableCell>
                      <TableCell className={cn('text-right tabular-nums', r.stats.absent > 0 && 'font-semibold text-destructive')}>{r.stats.absent}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.stats.late}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.stats.excused}</TableCell>
                      <TableCell className="pr-4">
                        {has ? (
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
