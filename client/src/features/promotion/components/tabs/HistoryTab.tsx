import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, DownloadSimple, Shuffle, GraduationCap, ArrowCounterClockwise, CheckCircle, SpinnerGap, ClockCounterClockwise } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { promotionApi } from '../../api/promotionApi';
import { downloadCSV } from '../../utils/csv';
import type { PromotionRecord, PromotionType } from '../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

const TYPE_META: Record<PromotionType, { label: string; icon: React.ElementType; className: string }> = {
  normal: {
    label: 'Promoted',
    icon: CheckCircle,
    className: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  },
  special: {
    label: 'Special',
    icon: Shuffle,
    className: 'text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/20',
  },
  retained: {
    label: 'Retained',
    icon: ArrowCounterClockwise,
    className: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20',
  },
  graduated: {
    label: 'Graduated',
    icon: GraduationCap,
    className: 'text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/20',
  },
};

const FILTERS: { id: string; label: string }[] = [
  { id: '', label: 'All Promotions' },
  { id: 'normal', label: 'Promoted' },
  { id: 'special', label: 'Special Moves' },
  { id: 'retained', label: 'Retained' },
  { id: 'graduated', label: 'Graduated' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function staffName(by: PromotionRecord['performed_by']): string {
  if (!by) return 'Unknown Staff';
  const full = `${by.firstName ?? ''} ${by.lastName ?? ''}`.trim();
  return full || by.username || 'Unknown Staff';
}

function studentName(student: PromotionRecord['student']): string {
  if (!student) return 'Unknown student';
  return `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || 'Unknown student';
}

export default function HistoryTab() {
  const [records, setRecords] = useState<PromotionRecord[]>([]);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    promotionApi
      .getHistory(type ? { type } : undefined)
      .then(setRecords)
      .catch(() => setError('Failed to load promotion history.'))
      .finally(() => setLoading(false));
  }, [type]);

  const groups = useMemo(() => {
    const map = new Map<string, PromotionRecord[]>();
    for (const record of records) {
      const key = record.batch_id || record._id;
      const group = map.get(key);
      if (group) group.push(record);
      else map.set(key, [record]);
    }
    return Array.from(map.entries());
  }, [records]);

  function exportGroup(rows: PromotionRecord[]) {
    downloadCSV(
      `promotion-${rows[0].batch_id ?? rows[0]._id}`,
      rows.map((r) => ({
        Student: studentName(r.student),
        RollNo: r.student?.admissionNumber ?? '',
        Type: TYPE_META[r.type].label,
        From: r.from_class?.cl_name ?? '',
        FromSection: r.from_section?.name ?? '',
        To: r.to_class?.cl_name ?? 'Graduated',
        ToSection: r.to_section?.name ?? '',
        Score: r.percentage ?? '',
        Reason: r.reason ?? '',
        By: staffName(r.performed_by),
        Date: formatDate(r.performed_at),
      })),
    );
  }

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <SpinnerGap size={32} className="animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return <div className="text-center py-24 text-destructive text-sm">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Funnel Tabs */}
      <Card className="border-border/80 shadow-2xs p-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f.id}
              onClick={() => setType(f.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                type === f.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {groups.length === 0 ? (
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-16 text-center space-y-2 text-muted-foreground">
            <ClockCounterClockwise size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">No promotion records found</p>
            <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto">
              No promotions match the selected Funnel. Confirm a promotion batch to see audit ClockCounterClockwise here.
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map(([key, rows]) => {
          const first = rows[0];
          const isBatch = Boolean(first.batch_id) && rows.length > 1;
          const counts = rows.reduce<Record<string, number>>((acc, r) => {
            acc[r.type] = (acc[r.type] ?? 0) + 1;
            return acc;
          }, {});

          return (
            <Card key={key} className="border-border/80 shadow-2xs">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">
                      {isBatch
                        ? `${first.from_class?.cl_name ?? 'Class'} → ${first.to_class?.cl_name ?? 'Graduated'}`
                        : `${studentName(first.student)} · ${first.from_class?.cl_name ?? '—'} → ${
                            first.to_class?.cl_name ?? 'Graduated'
                          }`}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {first.academic_year?.y_name ? `${first.academic_year.y_name} · ` : ''}
                      {formatDate(first.performed_at)} · Confirmed by {staffName(first.performed_by)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="hidden sm:flex items-center gap-2">
                      {Object.entries(counts).map(([t, count]) => {
                        const meta = TYPE_META[t as PromotionType];
                        return (
                          <Badge
                            key={t}
                            variant="secondary"
                            className={`inline-flex items-center gap-1 text-[11px] font-medium border px-2 py-0.5 ${meta.className}`}
                          >
                            <meta.icon size={11} /> {count} {meta.label}
                          </Badge>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportGroup(rows)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer h-8"
                    >
                      <DownloadSimple size={13} /> Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {first.type === 'special' && first.reason && (
                  <div className="m-5 rounded-xl bg-purple-500/10 border border-purple-500/20 px-4 py-3 text-xs sm:text-sm text-purple-900 dark:text-purple-300">
                    <span className="font-semibold">Reason for Special Promotion:</span> {first.reason}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table className="w-full text-sm">
                    <TableHeader>
                      <TableRow className="border-b border-border/60">
                        <TableHead className="pl-6 pr-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Roll No
                        </TableHead>
                        <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Name
                        </TableHead>
                        <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Movement
                        </TableHead>
                        <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Score %
                        </TableHead>
                        <TableHead className="px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">
                          Outcome
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => {
                        const meta = TYPE_META[r.type];
                        return (
                          <TableRow
                            key={r._id}
                            className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="pl-6 pr-5 py-3 text-sm text-muted-foreground font-mono">
                              {r.student?.admissionNumber ?? '—'}
                            </TableCell>
                            <TableCell className="px-5 py-3 font-semibold text-foreground">
                              {studentName(r.student)}
                            </TableCell>
                            <TableCell className="px-5 py-3 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="font-medium text-foreground">{r.from_class?.cl_name ?? '—'}</span>
                                {r.from_section?.name && (
                                  <span className="text-xs text-muted-foreground/80">({r.from_section.name})</span>
                                )}
                                <ArrowRight size={12} className="text-muted-foreground/60" />
                                <span className="font-medium text-foreground">
                                  {r.to_class?.cl_name ?? 'Graduated'}
                                </span>
                                {r.to_section?.name && (
                                  <span className="text-xs text-muted-foreground/80">({r.to_section.name})</span>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="px-5 py-3 text-sm font-semibold text-foreground">
                              {r.percentage === null || r.percentage === undefined ? (
                                <span className="text-muted-foreground/50 font-normal">—</span>
                              ) : (
                                `${r.percentage}%`
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-3 text-right">
                              <Badge
                                variant="secondary"
                                className={`inline-flex items-center gap-1 text-[11px] font-medium border px-2 py-0.5 ${meta.className}`}
                              >
                                <meta.icon size={11} /> {meta.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
