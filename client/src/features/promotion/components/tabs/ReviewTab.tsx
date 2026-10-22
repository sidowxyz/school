import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Users, CheckCircle, XCircle, PencilLine, GraduationCap, WarningCircle, SpinnerGap } from '@phosphor-icons/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusBadge } from '../shared';
import { SortableTh, TablePagination } from '@/components/shared/table';
import { useSortableTable } from '../../../../hooks/useSortableTable';
import FilterSelect from '@/components/shared/FilterSelect';
import { scopeParams, useResultScope } from '../../../results/hooks/useResultScope';
import { promotionApi } from '../../api/promotionApi';
import ConfirmPromotionModal from '../modals/ConfirmPromotionModal';
import type { LadderClass, PromotionPreview, WorkingDecision } from '../../types';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface Props {
  classId: string;
  onBack: () => void;
  onConfirmed: () => void;
}

export default function ReviewTab({ classId, onBack, onConfirmed }: Props) {
  // The examination whose published results decide pass/fail.
  const { scope, setScope, scopeOptions } = useResultScope();

  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [ladderClass, setLadderClass] = useState<LadderClass | null>(null);
  const [decisions, setDecisions] = useState<WorkingDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      promotionApi.getPreview({ class_id: classId, ...scopeParams(scope) }),
      promotionApi.getLadder(),
    ])
      .then(([previewData, ladder]) => {
        setPreview(previewData);
        setLadderClass(ladder.find((c) => c._id === classId) ?? null);
        setDecisions(
          previewData.students.map((student) => ({
            ...student,
            // With no published result the system takes no view — staff decide.
            decision: student.decision ?? 'promote',
            overridden: false,
          })),
        );
      })
      .catch(() => setError('Failed to load the promotion worksheet.'))
      .finally(() => setLoading(false));
  }, [classId, scope]);

  useEffect(load, [load]);

  const toggleDecision = (studentId: string) => {
    setDecisions((prev) =>
      prev.map((d) => {
        if (d.studentId !== studentId) return d;
        const next = d.decision === 'promote' ? 'retain' : 'promote';
        const auto = d.isPass === null ? null : d.isPass ? 'promote' : 'retain';
        return { ...d, decision: next, overridden: auto !== null && next !== auto };
      }),
    );
  };

  const rows = useMemo(() => decisions.map((d) => ({ ...d })), [decisions]);
  const { items, sortKey, sortDir, toggleSort, page, setPage, totalPages, totalItems, pageSize } =
    useSortableTable(rows, { pageSize: 10 });

  const promotedCount = decisions.Funnel((d) => d.decision === 'promote').length;
  const retainedCount = decisions.Funnel((d) => d.decision === 'retain').length;
  const overriddenCount = decisions.Funnel((d) => d.overridden).length;

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
  if (!preview) return null;

  const graduating = preview.next_class === null;
  const destinationLabel = graduating ? 'Graduated' : preview.next_class!.cl_name;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer -ml-2"
        >
          <ArrowLeft size={14} /> Back to class selection
        </Button>
      </div>

      {graduating && (
        <div className="flex items-center gap-3 bg-sky-500/10 border border-sky-500/20 text-sky-800 dark:text-sky-300 rounded-xl px-4 py-3 text-xs sm:text-sm">
          <GraduationCap size={18} className="shrink-0 text-sky-600 dark:text-sky-400" />
          <span>
            <strong className="font-semibold">{preview.class.cl_name}</strong> is the final class — confirming records
            these students as graduated rather than moving them into another class.
          </span>
        </div>
      )}

      {/* Hairline Divided Summary KPI Strip */}
      <Card className="overflow-hidden border-border bg-border shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px">
          <KPICell
            icon={Users}
            iconClass="text-primary"
            label="Total Students"
            value={String(decisions.length)}
            sub={`${preview.class.cl_name} → ${destinationLabel}`}
          />
          <KPICell
            icon={CheckCircle}
            iconClass="text-emerald-600 dark:text-emerald-400"
            label={graduating ? 'To Graduate' : 'To Be Promoted'}
            value={String(promotedCount)}
            sub={preview.has_results ? 'Passing criteria' : 'Awaiting decision'}
          />
          <KPICell
            icon={XCircle}
            iconClass={retainedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}
            label="To Be Retained"
            value={String(retainedCount)}
            sub="Stay in this class"
          />
          <KPICell
            icon={PencilLine}
            iconClass="text-amber-600 dark:text-amber-400"
            label="Manual Overrides"
            value={String(overriddenCount)}
            sub="Modified decisions"
          />
        </div>
      </Card>

      {/* Main Review Card */}
      <Card className="border-border/80 shadow-2xs">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Review — {preview.class.cl_name}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Decisions are computed from published examination results. Click a decision button to toggle it.
              </CardDescription>
            </div>
            <FilterSelect
              label="Result from"
              value={scope}
              onChange={setScope}
              options={
                scopeOptions.length
                  ? [{ value: '', label: 'No examination (decide manually)' }, ...scopeOptions]
                  : [{ value: '', label: 'No examinations scheduled' }]
              }
              className="min-w-[240px]"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {!preview.has_results && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs sm:text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
              <WarningCircle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                No published results for this class in the selected examination, so nothing is pre-decided. Set each
                student's outcome below before confirming.
              </span>
            </div>
          )}

          <div className="overflow-x-auto -mx-6">
            <Table className="w-full text-sm">
              <TableHeader>
                <TableRow className="border-b border-border/60">
                  <SortableTh
                    label="Roll No"
                    sortKeyName="rollNo"
                    activeKey={sortKey as string}
                    direction={sortDir}
                    onSort={(k: string) => toggleSort(k as keyof WorkingDecision)}
                    className="pl-6 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  />
                  <SortableTh
                    label="Name"
                    sortKeyName="name"
                    activeKey={sortKey as string}
                    direction={sortDir}
                    onSort={(k: string) => toggleSort(k as keyof WorkingDecision)}
                    className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  />
                  <SortableTh
                    label="Score %"
                    sortKeyName="percentage"
                    activeKey={sortKey as string}
                    direction={sortDir}
                    onSort={(k: string) => toggleSort(k as keyof WorkingDecision)}
                    className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  />
                  <TableHead className="px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Auto Result
                  </TableHead>
                  <TableHead className="px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground text-right">
                    Decision
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((d: WorkingDecision) => (
                  <TableRow
                    key={d.studentId}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="pl-6 pr-5 py-3 text-sm text-muted-foreground font-mono">
                      {d.rollNo}
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{d.name}</span>
                        {d.sectionName && (
                          <span className="inline-flex items-center text-[10px] font-medium bg-muted text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
                            {d.sectionName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3 text-sm font-semibold text-foreground">
                      {d.percentage === null ? (
                        <span className="text-muted-foreground/50 font-normal">—</span>
                      ) : (
                        `${d.percentage}%`
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3">
                      {d.isPass === null ? (
                        <span className="text-xs text-muted-foreground">No result</span>
                      ) : (
                        <StatusBadge status={d.isPass ? 'Promoted' : 'Retained'} />
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-3 text-right">
                      <Button
                        variant="plain"
                        size="sm"
                        onClick={() => toggleDecision(d.studentId)}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                          d.decision === 'promote'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20'
                        }`}
                      >
                        {d.decision === 'promote' ? (
                          graduating ? (
                            <>
                              <GraduationCap size={13} /> Graduate
                            </>
                          ) : (
                            <>
                              <CheckCircle size={13} /> Promote
                            </>
                          )
                        ) : (
                          <>
                            <XCircle size={13} /> Retain
                          </>
                        )}
                        {d.overridden && (
                          <span title="Overridden from auto-decision" className="ml-0.5 text-amber-600 dark:text-amber-400">
                            <PencilLine size={12} />
                          </span>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="pt-2">
            <TablePagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{promotedCount}</span> to{' '}
              {graduating ? 'graduate' : 'promote'},{' '}
              <span className="font-semibold text-foreground">{retainedCount}</span> to retain
              {overriddenCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  ({overriddenCount} manual {overriddenCount === 1 ? 'override' : 'overrides'})
                </span>
              )}
            </p>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={decisions.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold"
            >
              Review Summary &amp; Confirm
            </Button>
          </div>
        </CardContent>
      </Card>

      {confirmOpen && (
        <ConfirmPromotionModal
          classId={classId}
          className={preview.class.cl_name}
          destinationLabel={destinationLabel}
          nextClass={ladderClass?.next_class ?? null}
          decisions={decisions}
          onClose={() => setConfirmOpen(false)}
          onConfirmed={() => {
            setConfirmOpen(false);
            onConfirmed();
          }}
        />
      )}
    </div>
  );
}

/* ─── KPI Strip Cell ─── */
function KPICell({
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  iconClass: string;
  label: string;
  value: string;
  sub: string;
}) {
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
