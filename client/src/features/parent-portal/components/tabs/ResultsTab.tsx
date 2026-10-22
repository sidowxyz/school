import { useMemo } from 'react';
import { SpinnerGap, Trophy, ChartBar, CheckCircle, BookOpen, DownloadSimple } from '@phosphor-icons/react';
import { TabStatCard, SectionCard, StatusBadge, EmptyState } from '../shared';
import { downloadCSV } from '../../utils/csv';
import { parentPortalApi } from '../../api/parentPortalApi';
import type { PortalResult } from '../../../student-portal/api/portalApi';
import { useChildResource } from '../../hooks/useChildResource';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const subjectName = (r: PortalResult) => r.cc_no?.sub_no?.sub_name ?? '—';
const examName = (r: PortalResult) => r.ex_r_no?.ex_no?.ex_name ?? '—';
const totalMarks = (r: PortalResult) => r.ex_r_no?.total_marks;
const pct = (r: PortalResult): number | null => {
  const total = totalMarks(r);
  if (typeof r.marks === 'number' && typeof total === 'number' && total > 0) return Math.round((r.marks / total) * 100);
  return null;
};

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

export default function ResultsTab() {
  const { data, loading, error } = useChildResource(parentPortalApi.getChildResults);
  const results: PortalResult[] = data ?? [];

  const stats = useMemo(() => {
    const pcts = results.map(pct).Funnel((v): v is number => v !== null);
    const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
    const passed = pcts.Funnel((v) => v >= 50).length;
    const subjects = new Set(results.map((r) => subjectName(r)).Funnel((s) => s !== '—')).size;
    return { avg, passed, subjects, count: results.length };
  }, [results]);

  const exportResults = () => {
    downloadCSV('child-results', results.map((r) => ({
      Subject: subjectName(r), Exam: examName(r), Marks: r.marks ?? '',
      Total: totalMarks(r) ?? '', Percentage: pct(r) ?? '', Grade: r.grade ?? '', Date: formatDate(r.createDate),
    })));
  };

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-green-600" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <TabStatCard title="Results" value={String(stats.count)} icon={ChartBar} iconColor="text-green-600" iconBg="bg-green-50" />
        <TabStatCard title="Average %" value={stats.avg !== null ? `${stats.avg}%` : '—'} icon={Trophy} iconColor="text-orange-500" iconBg="bg-orange-50" />
        <TabStatCard title="Subjects" value={String(stats.subjects)} icon={BookOpen} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <TabStatCard title="Passed" value={String(stats.passed)} icon={CheckCircle} iconColor="text-green-600" iconBg="bg-green-50" />
      </div>

      {results.length === 0 ? (
        <SectionCard title="Results">
          <EmptyState text="No results have been published for this child yet." />
        </SectionCard>
      ) : (
        <SectionCard
          title="Exam Results"
          subtitle="Published subject assessments and letter grades"
          action={
            <Button variant="outline" size="sm" onClick={exportResults} className="gap-1.5 text-xs h-8 shadow-xs">
              <DownloadSimple size={13} /> Export CSV
            </Button>
          }
        >
          <div className="overflow-x-auto -mx-5">
            <Table className="w-full min-w-[640px]">
              <TableHeader>
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Subject</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Assessment</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Marks</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Percentage</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Grade</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => {
                  const p = pct(r);
                  const total = totalMarks(r);
                  return (
                    <TableRow key={r._id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                      <TableCell className="px-5 py-3 font-semibold text-xs text-foreground">{subjectName(r)}</TableCell>
                      <TableCell className="px-5 py-3 text-xs text-muted-foreground">{examName(r)}</TableCell>
                      <TableCell className="px-5 py-3 font-mono text-xs text-foreground">
                        {typeof r.marks === 'number' ? r.marks : '—'}
                        {typeof total === 'number' && <span className="text-muted-foreground/70"> / {total}</span>}
                      </TableCell>
                      <TableCell className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{p !== null ? `${p}%` : '—'}</TableCell>
                      <TableCell className="px-5 py-3">{r.grade ? <StatusBadge status={r.grade} /> : '—'}</TableCell>
                      <TableCell className="px-5 py-3 text-xs text-muted-foreground">{formatDate(r.createDate)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
