import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowsClockwise, CurrencyDollar, GraduationCap, Printer, SpinnerGap, UserCheck, Users, WarningCircle } from '@phosphor-icons/react';

import PageHeader from '../../../components/common/PageHeader';
import StatStrip, { type StatItem } from '../../../components/shared/StatStrip';
import { academicApi } from '../../academic-structure/api/academicApi';
import type { Class, Year } from '../../academic-structure/types';
import { Donut } from '../components/ReportsOverview';
import { reportsApi } from '../api/reportsApi';
import type { ReportCell, ReportResult } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

// The page is a one-screen summary built from a handful of the existing
// reports. Each block only appears when the signed-in role can run its report;
// the full detail for everything else lives in each module.
const WANTED = [
  'students-by-class',
  'students-enrollment-trend',
  'finance-collection-summary',
  'finance-aging',
  'finance-outstanding-students',
  'finance-collection-by-class',
  'teaching-my-classes',
  'teaching-low-attendance',
] as const;
type ReportId = (typeof WANTED)[number];
type Results = Partial<Record<ReportId, ReportResult>>;

const COLORS = ['hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--violet))', 'hsl(var(--destructive))'];
const AXIS = { fontSize: 12, fill: 'hsl(var(--muted-foreground))' };

const num = (v: unknown) => Number(v) || 0;
const money = (n: number) => `$${num(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const summaryValue = (report: ReportResult | undefined, label: string) =>
  report?.summary.find((s) => s.label === label)?.value;

function formatCell(value: ReportCell, type?: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'money') return money(num(value));
  if (type === 'date') return new Date(String(value)).toLocaleDateString();
  return String(value);
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card className="rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </Card>
  );
}

function Bars({ data, x, series, stacked, money: asMoney }: { data: Record<string, unknown>[]; x: string; series: { key: string; name: string }[]; stacked?: boolean; money?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
        <XAxis dataKey={x} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(v) => (asMoney ? money(Number(v)) : String(v))} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} fill={COLORS[i % COLORS.length]} stackId={stacked ? 'a' : undefined} radius={stacked ? 0 : [6, 6, 0, 0]} barSize={stacked ? 28 : 18} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** A short table of the first few rows of a report, limited to the columns that matter. */
function MiniTable({ title, subtitle, report, keys, limit = 5 }: { title: string; subtitle: string; report: ReportResult; keys: string[]; limit?: number }) {
  const columns = keys.map((k) => report.columns.find((c) => c.key === k)).filter((c): c is NonNullable<typeof c> => Boolean(c));
  const rows = report.rows.slice(0, limit);
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nothing to show.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                {columns.map((c) => (
                  <th key={c.key} className={`px-5 py-2.5 font-semibold ${c.type === 'number' || c.type === 'money' ? 'text-right' : ''}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/40">
                  {columns.map((c) => (
                    <td key={c.key} className={`whitespace-nowrap px-5 py-3 ${c.type === 'number' || c.type === 'money' ? 'text-right font-medium tabular-nums' : 'text-foreground/80'}`}>
                      {formatCell(row[c.key], c.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function ReportsPage() {
  const [available, setAvailable] = useState<Set<string> | null>(null);
  const [years, setYears] = useState<Year[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [results, setResults] = useState<Results>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The catalogue is filtered to this role server-side: whatever arrives is what may be run.
  useEffect(() => {
    reportsApi
      .getCatalog()
      .then((departments) => setAvailable(new Set(departments.flatMap((d) => d.groups.flatMap((g) => g.reports.map((r) => r.id))))))
      .catch(() => {
        setAvailable(new Set());
        setError('Failed to load reports.');
      });
    academicApi.getYears().then(setYears).catch(() => undefined);
    academicApi.getClasses().then(setClasses).catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    if (!available) return;
    setLoading(true);
    const filters: Record<string, string> = {};
    if (yearId) filters.year_id = yearId;
    if (classId) filters.class_id = classId;
    if (from) filters.from = from;
    if (to) filters.to = to;

    const ids = WANTED.filter((id) => available.has(id));
    const settled = await Promise.allSettled(ids.map((id) => reportsApi.run(id, filters)));
    const next: Results = {};
    settled.forEach((result, i) => {
      if (result.status === 'fulfilled') next[ids[i]] = result.value;
    });
    setResults(next);
    setError(ids.length > 0 && Object.keys(next).length === 0 ? 'Could not load the report data.' : null);
    setLoading(false);
  }, [available, yearId, classId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const r = results;

  const stats = useMemo(() => {
    const items: StatItem[] = [];
    const students = summaryValue(r['students-by-class'], 'Students');
    if (students !== undefined) {
      items.push({ label: 'Students', value: num(students).toLocaleString(), icon: Users, tone: 'sky', hint: `${summaryValue(r['students-by-class'], 'Classes') ?? 0} classes` });
    }
    const collection = r['finance-collection-summary'];
    if (collection) {
      items.push({ label: 'Collected', value: money(num(summaryValue(collection, 'Collected Revenue'))), icon: CurrencyDollar, tone: 'emerald', hint: `${summaryValue(collection, 'Collection Rate')} collection rate` });
      items.push({ label: 'Outstanding', value: money(num(summaryValue(collection, 'Outstanding Revenue'))), icon: WarningCircle, tone: 'amber', hint: `${summaryValue(r['finance-outstanding-students'], 'Students Owing') ?? 0} students owing` });
    }
    const mine = r['teaching-my-classes'];
    if (mine) {
      items.push({ label: 'My classes', value: num(summaryValue(mine, 'Classes')), icon: GraduationCap, tone: 'violet', hint: `${num(summaryValue(mine, 'Students'))} students` });
      const low = r['teaching-low-attendance'];
      if (low) items.push({ label: 'Low attendance', value: num(summaryValue(low, 'Below Threshold')), icon: UserCheck, tone: 'rose', hint: `Below ${summaryValue(low, 'Threshold')}` });
    }
    return items.slice(0, 4);
  }, [r]);

  const hasAnything = Object.keys(r).length > 0;
  const trend = r['students-enrollment-trend'];
  const collection = r['finance-collection-summary'];
  const showFilters = available ? [...available].some((id) => (WANTED as readonly string[]).includes(id)) : false;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Reports & Analytics"
        subtitle="The key numbers at a glance. Detailed lists are in each module."
        action={
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" onClick={() => void load()} disabled={loading} className="h-10 gap-2 rounded-xl">
              <ArrowsClockwise size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!hasAnything} className="h-10 gap-2 rounded-xl">
              <Printer size={15} /> Print
            </Button>
          </div>
        }
      />

      {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {showFilters && (
        <Card className="rounded-2xl p-4 print:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-foreground/80">Academic year</span>
              <NativeSelect value={yearId} onChange={(e) => setYearId(e.target.value)} className="h-10 min-w-[170px] rounded-xl bg-muted/40 px-3 text-sm">
                <option value="">All years</option>
                {years.map((y) => <option key={y._id} value={y._id}>{y.y_name}</option>)}
              </NativeSelect>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-foreground/80">Class</span>
              <NativeSelect value={classId} onChange={(e) => setClassId(e.target.value)} className="h-10 min-w-[170px] rounded-xl bg-muted/40 px-3 text-sm">
                <option value="">All classes</option>
                {classes.map((c) => <option key={c._id} value={c._id}>{c.cl_name}</option>)}
              </NativeSelect>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-foreground/80">From</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl bg-muted/40" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-foreground/80">To</span>
              <Input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl bg-muted/40" />
            </label>
            {(yearId || classId || from || to) && (
              <Button variant="ghost" className="h-10 rounded-xl text-muted-foreground" onClick={() => { setYearId(''); setClassId(''); setFrom(''); setTo(''); }}>
                Clear
              </Button>
            )}
          </div>
        </Card>
      )}

      {loading && !hasAnything ? (
        <div className="flex items-center justify-center py-24"><SpinnerGap className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !hasAnything ? (
        <Card className="rounded-2xl p-12 text-center text-sm text-muted-foreground">No report data is available for your role.</Card>
      ) : (
        <div className={loading ? 'space-y-5 opacity-60 transition-opacity' : 'space-y-5 transition-opacity'}>
          {stats.length > 0 && <StatStrip items={stats} />}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {collection && (
              <Donut
                title="Fee collection"
                subtitle="Collected vs outstanding"
                format={money}
                data={[
                  { name: 'Collected', value: num(summaryValue(collection, 'Collected Revenue')) },
                  { name: 'Outstanding', value: num(summaryValue(collection, 'Outstanding Revenue')) },
                ]}
              />
            )}
            {r['students-by-class'] && (
              <ChartCard title="Students by class" subtitle="Headcount with gender split">
                <Bars data={r['students-by-class'].rows} x="className" stacked series={[{ key: 'male', name: 'Male' }, { key: 'female', name: 'Female' }]} />
              </ChartCard>
            )}
            {collection && collection.rows.length > 0 && (
              <ChartCard title="Fees by type" subtitle="Expected vs collected">
                <Bars data={collection.rows} x="feeType" money series={[{ key: 'expected', name: 'Expected' }, { key: 'collected', name: 'Collected' }]} />
              </ChartCard>
            )}
            {r['finance-aging'] && r['finance-aging'].rows.length > 0 && (
              <ChartCard title="Unpaid balances by age" subtitle="How overdue the outstanding money is">
                <Bars data={r['finance-aging'].rows} x="bucket" money series={[{ key: 'balance', name: 'Outstanding' }]} />
              </ChartCard>
            )}
            {trend && trend.rows.length > 1 && (
              <ChartCard title="Enrolment trend" subtitle="Admissions per month">
                <Bars data={trend.rows} x="month" series={[{ key: 'admissions', name: 'Admissions' }, { key: 'transfers', name: 'Transfers' }]} />
              </ChartCard>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {r['finance-outstanding-students'] && (
              <MiniTable title="Largest outstanding balances" subtitle="Top 5 students who owe the most" report={r['finance-outstanding-students']} keys={['name', 'className', 'balance']} />
            )}
            {r['finance-collection-by-class'] && (
              <MiniTable title="Collection by class" subtitle="Classes with the most unpaid" report={r['finance-collection-by-class']} keys={['className', 'collected', 'outstanding', 'collectionRate']} limit={6} />
            )}
            {r['teaching-my-classes'] && (
              <MiniTable title="My classes" subtitle="Classes you teach" report={r['teaching-my-classes']} keys={['className', 'students', 'subjects', 'periods']} limit={6} />
            )}
            {r['teaching-low-attendance'] && (
              <MiniTable title="Low attendance" subtitle="Students below the attendance threshold" report={r['teaching-low-attendance']} keys={['name', 'className', 'present', 'absent', 'rate']} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
