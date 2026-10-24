import { useCallback, useEffect, useMemo, useState } from 'react';
import { DownloadSimple, Printer, SpinnerGap, CurrencyDollar, CheckCircle, Clock, Percent } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { MonthPicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatStrip from '@/components/shared/StatStrip';
import { EmptyState } from '@/components/common/EmptyState';
import { usePrintTarget } from '@/hooks/usePrintTarget';
import { cn } from '@/lib/utils';
import { downloadCSV } from '../../reports/utils/csv';
import { monthlyFeesApi, apiError } from '../api/monthlyFeesApi';
import ReceiptsCard from './ReceiptsCard';
import { money, periodLabel, thisPeriod, type ClassFee, type FeeReport } from '../monthlyTypes';

type StudentFilter = 'owing' | 'all';

export default function FeeReportTab() {
  const now = thisPeriod();
  const [from, setFrom] = useState(`${now.slice(0, 4)}-01`);
  const [to, setTo] = useState(now);
  const [levelId, setLevelId] = useState('');
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState<ClassFee[]>([]);
  const [report, setReport] = useState<FeeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentFilter, setStudentFilter] = useState<StudentFilter>('owing');
  const { ref, print } = usePrintTarget();

  useEffect(() => { monthlyFeesApi.getClassFees().then(setClasses).catch(() => undefined); }, []);

  const levels = useMemo(() => {
    const seen = new Map<string, string>();
    classes.forEach((c) => { if (c.level_id) seen.set(c.level_id, c.level); });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [classes]);
  const classOptions = classes.filter((c) => !levelId || c.level_id === levelId);

  const load = useCallback(async () => {
    if (!from || !to || from > to) { setError('Choose a start month before the end month.'); return; }
    setLoading(true);
    setError(null);
    try {
      setReport(await monthlyFeesApi.getReport({ from, to, level_id: levelId || undefined, class_id: classId || undefined }));
    } catch (err) {
      setError(apiError(err, 'Could not load the report.'));
    } finally {
      setLoading(false);
    }
  }, [from, to, levelId, classId]);

  useEffect(() => { load(); }, [load]);

  const students = (report?.byStudent ?? []).filter((s) => studentFilter === 'all' || s.outstanding > 0);
  const t = report?.totals;
  const range = from === to ? periodLabel(from) : `${periodLabel(from, true)} – ${periodLabel(to, true)}`;

  const exportCsv = () => {
    if (!report) return;
    downloadCSV(`fees-${from}-to-${to}`, report.byStudent.map((s) => ({
      Student: s.name,
      'Admission No.': s.admissionNumber ?? '',
      Class: s.className,
      Months: s.months,
      Charged: s.charged,
      Discount: s.discount,
      'To pay': s.net,
      Paid: s.collected,
      Owed: s.outstanding,
    })));
  };

  return (
    <div className="space-y-5">
      <Card className="border-border shadow-xs print:hidden">
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="rp-from" className="text-xs">From</Label>
            <MonthPicker id="rp-from" value={from} max={to || undefined} onChange={(v) => v && setFrom(v)} className="w-44" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-to" className="text-xs">To</Label>
            <MonthPicker id="rp-to" value={to} min={from || undefined} onChange={(v) => v && setTo(v)} className="w-44" />
          </div>
          <div className="min-w-[150px] space-y-1.5">
            <Label htmlFor="rp-level" className="text-xs">Level</Label>
            <NativeSelect id="rp-level" value={levelId} onChange={(e) => { setLevelId(e.target.value); setClassId(''); }}>
              <option value="">All levels</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </NativeSelect>
          </div>
          <div className="min-w-[150px] space-y-1.5">
            <Label htmlFor="rp-class" className="text-xs">Class</Label>
            <NativeSelect id="rp-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">All classes</option>
              {classOptions.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </NativeSelect>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={!report?.byStudent.length}><DownloadSimple size={15} /> CSV</Button>
            <Button variant="outline" onClick={print} disabled={!report}><Printer size={15} /> Print</Button>
          </div>
        </CardContent>
      </Card>

      {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {loading && !report && <div className="flex justify-center py-12"><SpinnerGap size={22} className="animate-spin text-primary" /></div>}

      {report && t && (
        <div ref={ref} className="space-y-5">
          <div className="hidden print:block">
            <p className="text-lg font-bold">Fee report · {range}</p>
            <p className="text-xs text-muted-foreground">
              {levelId ? levels.find((l) => l.id === levelId)?.name : 'All levels'} · {classId ? classes.find((c) => c._id === classId)?.name : 'All classes'} · printed {new Date().toLocaleString()}
            </p>
          </div>

          <StatStrip items={[
            { label: 'To collect', value: money(t.net), icon: CurrencyDollar, tone: 'sky', hint: `${t.students} students · ${range}` },
            { label: 'Collected', value: money(t.collected), icon: CheckCircle, tone: 'emerald', hint: `${t.collectionRate}% of what was charged` },
            { label: 'Still owed', value: money(t.outstanding), icon: Clock, tone: 'rose', hint: 'Unpaid and part-paid months' },
            { label: 'Discounts given', value: money(t.discount), icon: Percent, tone: 'violet', hint: `On ${money(t.charged)} of full fees` },
          ]} />

          {report.byClass.length === 0 ? (
            <EmptyState text="Nothing was charged in this period. Set class fees and charge a month first." />
          ) : (
            <>
              <Card className="overflow-hidden border-border shadow-xs">
                <CardHeader className="pb-2"><CardTitle className="text-sm">By class</CardTitle></CardHeader>
                <AmountsTable
                  first="Class"
                  rows={report.byClass.map((c) => ({ key: c._id, label: c.name, sub: `${c.students} students`, ...c }))}
                  totals={t}
                />
              </Card>

              {report.byMonth.length > 1 && (
                <Card className="overflow-hidden border-border shadow-xs">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">By month</CardTitle></CardHeader>
                  <AmountsTable
                    first="Month"
                    rows={report.byMonth.map((m) => ({ key: m.period, label: periodLabel(m.period), ...m }))}
                    totals={t}
                  />
                </Card>
              )}

              <Card className="overflow-hidden border-border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Students {studentFilter === 'owing' ? 'who still owe' : ''} ({students.length})</CardTitle>
                  <NativeSelect value={studentFilter} onChange={(e) => setStudentFilter(e.target.value as StudentFilter)} className="h-8 w-40 text-xs print:hidden">
                    <option value="owing">Still owing</option>
                    <option value="all">All students</option>
                  </NativeSelect>
                </CardHeader>
                {students.length === 0 ? (
                  <EmptyState text="Everyone has paid for this period." />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Months</TableHead>
                          <TableHead className="text-right">To pay</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Owed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((s) => (
                          <TableRow key={s._id}>
                            <TableCell><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.admissionNumber}</p></TableCell>
                            <TableCell>{s.className}</TableCell>
                            <TableCell className="text-right tabular-nums">{s.months}</TableCell>
                            <TableCell className="text-right tabular-nums">{money(s.net)}</TableCell>
                            <TableCell className="text-right tabular-nums">{money(s.collected)}</TableCell>
                            <TableCell className={cn('text-right font-semibold tabular-nums', s.outstanding > 0 ? 'text-destructive' : 'text-success')}>{money(s.outstanding)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      {from && to && from <= to && <ReceiptsCard from={from} to={to} />}
    </div>
  );
}

interface AmountRow { key: string; label: string; sub?: string; charged: number; discount: number; net: number; collected: number; outstanding: number; paid: number; partial: number; unpaid: number }

function AmountsTable({ first, rows, totals }: { first: string; rows: AmountRow[]; totals: FeeReport['totals'] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{first}</TableHead>
            <TableHead className="text-right">Full fees</TableHead>
            <TableHead className="text-right">Discounts</TableHead>
            <TableHead className="text-right">To pay</TableHead>
            <TableHead className="text-right">Collected</TableHead>
            <TableHead className="text-right">Owed</TableHead>
            <TableHead className="text-right">Paid / part / unpaid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key}>
              <TableCell><p className="font-medium">{r.label}</p>{r.sub && <p className="text-xs text-muted-foreground">{r.sub}</p>}</TableCell>
              <TableCell className="text-right tabular-nums">{money(r.charged)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{r.discount ? `−${money(r.discount)}` : '—'}</TableCell>
              <TableCell className="text-right tabular-nums">{money(r.net)}</TableCell>
              <TableCell className="text-right tabular-nums text-success">{money(r.collected)}</TableCell>
              <TableCell className={cn('text-right font-semibold tabular-nums', r.outstanding > 0 && 'text-destructive')}>{money(r.outstanding)}</TableCell>
              <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{r.paid} / {r.partial} / {r.unpaid}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        {rows.length > 1 && (
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{money(totals.charged)}</TableCell>
              <TableCell className="text-right tabular-nums">{totals.discount ? `−${money(totals.discount)}` : '—'}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{money(totals.net)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{money(totals.collected)}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{money(totals.outstanding)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
