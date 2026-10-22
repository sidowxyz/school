import { useMemo } from 'react';
import { SpinnerGap, CheckCircle, XCircle, Clock, Info, TrendUp } from '@phosphor-icons/react';
import { TabStatCard, SectionCard, StatusBadge, EmptyState } from '../shared';
import { parentPortalApi } from '../../api/parentPortalApi';
import { useChildResource } from '../../hooks/useChildResource';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AttendanceTab() {
  const { data, loading, error } = useChildResource(parentPortalApi.getChildAttendance);

  const records = data?.records ?? [];
  const summary = data?.summary ?? {};
  const total = data?.total ?? 0;
  const present = summary.Present ?? 0;
  const overallRate = total > 0 ? Math.round((present / total) * 100) : 0;

  const recent = useMemo(
    () => [...records].sort((a, b) => b.att_date.localeCompare(a.att_date)).slice(0, 50),
    [records],
  );

  if (loading) {
    return <div className="py-24 flex items-center justify-center"><SpinnerGap size={32} className="animate-spin text-green-600" /></div>;
  }
  if (error) {
    return <div className="text-center py-24 text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <TabStatCard title="Present" value={String(present)} icon={CheckCircle} iconColor="text-green-600" iconBg="bg-green-50" />
        <TabStatCard title="Absent" value={String(summary.Absent ?? 0)} icon={XCircle} iconColor="text-red-500" iconBg="bg-red-50" />
        <TabStatCard title="Late" value={String(summary.Late ?? 0)} icon={Clock} iconColor="text-amber-500" iconBg="bg-amber-50" />
        <TabStatCard title="Excused" value={String(summary.Excused ?? 0)} icon={Info} iconColor="text-blue-500" iconBg="bg-blue-50" />
        <TabStatCard title="Overall %" value={`${overallRate}%`} icon={TrendUp} iconColor="text-green-600" iconBg="bg-green-50" />
      </div>

      {records.length === 0 ? (
        <SectionCard title="Attendance">
          <EmptyState text="No attendance has been recorded for this child yet." />
        </SectionCard>
      ) : (
        <SectionCard title="Attendance Records" subtitle="Most recent recorded class and subject sessions">
          <div className="overflow-x-auto -mx-5">
            <Table className="w-full min-w-[520px]">
              <TableHeader>
                <TableRow className="border-b border-border/60 hover:bg-transparent">
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Date</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Period</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Status</TableHead>
                  <TableHead className="px-5 py-2.5 font-semibold text-xs">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r._id} className="border-b border-border/40 hover:bg-muted/40 transition-colors">
                    <TableCell className="px-5 py-3 text-xs font-medium text-foreground">{formatDate(r.att_date)}</TableCell>
                    <TableCell className="px-5 py-3 font-semibold text-xs text-primary">{r.periodId?.per_name || '—'}</TableCell>
                    <TableCell className="px-5 py-3"><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="px-5 py-3 text-xs text-muted-foreground">{r.remarks || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
