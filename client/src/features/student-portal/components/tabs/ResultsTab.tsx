import { useEffect, useMemo, useState } from 'react';
import { SpinnerGap, Trophy, ChartBar, CheckCircle, BookOpen, DownloadSimple } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusBadge } from '../shared';
import { downloadCSV } from '../../utils/csv';
import { portalApi, type PortalResult } from '../../api/portalApi';
import { usePortal } from '../../context/PortalContext';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const subjectName = (r: PortalResult) => r.cc_no?.sub_no?.sub_name ?? '—';
const examName = (r: PortalResult) => r.ex_r_no?.ex_no?.ex_name ?? '—';
const totalMarks = (r: PortalResult) => r.ex_r_no?.total_marks;

const pct = (r: PortalResult): number | null => {
  const total = totalMarks(r);
  if (typeof r.marks === 'number' && typeof total === 'number' && total > 0) {
    return Math.round((r.marks / total) * 100);
  }
  return null;
};

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function ResultsTab() {
  const { studentId } = usePortal();
  const [results, setResults] = useState<PortalResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await portalApi.getResults(studentId);
        if (!cancelled) { setResults(data); setError(''); }
      } catch (err) {
        if (!cancelled) { console.error(err); setError('Failed to load results.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId]);

  const stats = useMemo(() => {
    const pcts = results.map(pct).Funnel((v): v is number => v !== null);
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
    const passed = pcts.Funnel((v) => v >= 50).length;
    const subjects = new Set(results.map((r) => subjectName(r)).Funnel((s) => s !== '—')).size;
    return { avg, passed, subjects, count: results.length };
  }, [results]);

  const exportResults = () => {
    downloadCSV('results', results.map((r) => ({
      Subject: subjectName(r), Exam: examName(r),
      Marks: r.marks ?? '', Total: totalMarks(r) ?? '',
      Percentage: pct(r) ?? '', Grade: r.grade ?? '', Date: formatDate(r.createDate),
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px">
          <KPICell icon={ChartBar} iconClass="text-emerald-600 dark:text-emerald-400" label="Results" value={String(stats.count)} sub="Total published" />
          <KPICell icon={Trophy} iconClass="text-amber-600 dark:text-amber-400" label="Average %" value={stats.avg !== null ? `${stats.avg}%` : '—'} sub="Across all exams" />
          <KPICell icon={BookOpen} iconClass="text-sky-600 dark:text-sky-400" label="Subjects" value={String(stats.subjects)} sub="Unique subjects" />
          <KPICell icon={CheckCircle} iconClass="text-emerald-600 dark:text-emerald-400" label="Passed" value={String(stats.passed)} sub="≥ 50% threshold" />
        </div>
      </Card>

      {/* Results Table */}
      {results.length === 0 ? (
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-0">
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <Trophy size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-sm font-medium">No results published</p>
              <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
                No results have been published for you yet. Results will appear once exams are graded.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/80 shadow-2xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Exam Results</CardTitle>
                <CardDescription className="text-xs mt-0.5">Published marks and grades from all exams</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={exportResults}
                className="inline-flex items-center gap-1.5 text-xs font-medium"
              >
                <DownloadSimple size={13} /> Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[640px]">
                <TableHeader>
                  <TableRow className="border-b border-border/60">
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Subject</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Exam</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Marks</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">%</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Grade</TableHead>
                    <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => {
                    const p = pct(r);
                    const total = totalMarks(r);
                    return (
                      <TableRow key={r._id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                        <TableCell className="px-5 py-3 text-sm font-medium text-foreground">{subjectName(r)}</TableCell>
                        <TableCell className="px-5 py-3 text-sm text-muted-foreground">{examName(r)}</TableCell>
                        <TableCell className="px-5 py-3 text-sm text-foreground">
                          {typeof r.marks === 'number' ? r.marks : '—'}
                          {typeof total === 'number' && <span className="text-muted-foreground"> / {total}</span>}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-sm font-semibold text-foreground">{p !== null ? `${p}%` : '—'}</TableCell>
                        <TableCell className="px-5 py-3">{r.grade ? <StatusBadge status={r.grade} /> : '—'}</TableCell>
                        <TableCell className="px-5 py-3 text-sm text-muted-foreground">{formatDate(r.createDate)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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
