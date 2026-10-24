import { useCallback, useEffect, useRef, useState } from 'react';
import { Exam, Printer, Trophy } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import FilterSelect from '@/components/shared/FilterSelect';
import { printElement } from '@/lib/printElement';
import { cn } from '@/lib/utils';
import { useSchoolIdentity } from '../../settings/hooks/useSchoolIdentity';
import { examsApi, apiMessage } from '../api/examsApi';
import { formatPercent, GRADE_TONE, ordinal } from '../grading';
import type { ReportCard, ReportCardResponse } from '../types';

export function GradeChip({ grade, className }: { grade: string | null | undefined; className?: string }) {
  if (!grade) return <span className="text-muted-foreground">—</span>;
  return <span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-bold', GRADE_TONE[grade] ?? 'bg-muted', className)}>{grade}</span>;
}

const scoreText = (s?: { score: number | null; absent: boolean }) => (!s ? '—' : s.absent ? 'Abs' : s.score ?? '—');

/** The paper report card: school header, one row per subject, totals, position and the grade scale. */
export function ReportCardView({ card }: { card: ReportCard }) {
  const { schoolName, logoSrc } = useSchoolIdentity();
  return (
    <div className="space-y-5 bg-card p-6 text-sm text-foreground">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="" className="h-12 w-12 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <p className="text-lg font-bold">{schoolName}</p>
            <p className="text-xs text-muted-foreground">Student report card</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold">{card.term.name}</p>
          <p className="text-xs text-muted-foreground">{card.term.year ?? ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-4">
        <p><span className="block text-muted-foreground">Student</span><span className="font-semibold">{card.student.name}</span></p>
        <p><span className="block text-muted-foreground">Admission no.</span><span className="font-semibold">{card.student.admissionNumber ?? '—'}</span></p>
        <p><span className="block text-muted-foreground">Class</span><span className="font-semibold">{[card.className, card.sectionName].filter(Boolean).join(' ') || '—'}</span></p>
        <p><span className="block text-muted-foreground">Position</span><span className="font-semibold">{card.position ? `${ordinal(card.position)} of ${card.classSize}` : '—'}</span></p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-[11px] uppercase tracking-wide hover:bg-muted/50">
              <TableHead className="font-semibold">Subject</TableHead>
              {card.exams.map((e) => (
                <TableHead key={e._id} className="text-center font-semibold">{e.name}<span className="block text-[10px] font-normal normal-case">out of {e.maxMarks}</span></TableHead>
              ))}
              <TableHead className="text-center font-semibold">Total</TableHead>
              <TableHead className="text-center font-semibold">%</TableHead>
              <TableHead className="text-center font-semibold">Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {card.subjects.map((s) => (
              <TableRow key={s._id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                {card.exams.map((e) => <TableCell key={e._id} className="text-center tabular-nums">{scoreText(s.scores[e._id])}</TableCell>)}
                <TableCell className="text-center tabular-nums">{s.earned} / {s.possible}</TableCell>
                <TableCell className="text-center tabular-nums">{formatPercent(s.percent)}</TableCell>
                <TableCell className="text-center"><GradeChip grade={s.grade?.grade} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
          {card.total && (
            <TableFooter>
              <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40">
                <TableCell>Overall</TableCell>
                {card.exams.map((e) => <TableCell key={e._id} />)}
                <TableCell className="text-center tabular-nums">{card.total.earned} / {card.total.possible}</TableCell>
                <TableCell className="text-center tabular-nums">{formatPercent(card.total.percent)}</TableCell>
                <TableCell className="text-center"><GradeChip grade={card.total.grade?.grade} /></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-tile-green p-3 text-tile-foreground">
          <p className="text-[11px] font-medium opacity-80">Average</p>
          <p className="text-xl font-bold">{formatPercent(card.total?.percent)}</p>
        </div>
        <div className="rounded-xl bg-tile-blue p-3 text-tile-foreground">
          <p className="text-[11px] font-medium opacity-80">Grade</p>
          <p className="text-xl font-bold">{card.total?.grade ? `${card.total.grade.grade} · ${card.total.grade.label}` : '—'}</p>
        </div>
        <div className="rounded-xl bg-tile-yellow p-3 text-tile-foreground">
          <p className="text-[11px] font-medium opacity-80">Class average</p>
          <p className="text-xl font-bold">{formatPercent(card.classAverage)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {card.gradeScale.map((b) => <span key={b.grade}><span className="font-semibold text-foreground">{b.grade}</span> {b.min}%+ {b.label}</span>)}
        <span>· Pass mark {card.passPercent}%</span>
      </div>

      <div className="grid grid-cols-2 gap-10 pt-8 text-xs text-muted-foreground">
        <p className="border-t border-border pt-1.5">Class teacher</p>
        <p className="border-t border-border pt-1.5">Principal</p>
      </div>
    </div>
  );
}

/** Term picker + report card + print, loaded by `load` (portal or staff endpoint). */
export function ReportCardPanel({ load, emptyText = 'Results appear here once the school publishes them.' }: {
  load: (termId?: string) => Promise<ReportCardResponse>;
  emptyText?: string;
}) {
  const [data, setData] = useState<ReportCardResponse | null>(null);
  const [termId, setTermId] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCard = useCallback(async (term?: string) => {
    setLoading(true);
    try {
      const res = await load(term);
      setData(res);
      setTermId(res.card?.term._id ?? '');
      setError('');
    } catch (err) {
      setError(apiMessage(err, 'Could not load the results.'));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => { void fetchCard(); }, [fetchCard]);

  if (error) return <ErrorState text={error} onRetry={() => void fetchCard(termId || undefined)} />;
  if (loading && !data) return <div className="h-64 animate-pulse rounded-2xl bg-muted/50" />;
  if (!data?.card) return <EmptyState icon={Exam} tint="green" title="No results yet" text={emptyText} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <FilterSelect label="Term" value={termId} onChange={(v) => void fetchCard(v)} className="w-60"
          options={data.terms.map((t) => ({ value: t._id, label: t.year ? `${t.name} · ${t.year}` : t.name }))} />
        <Button variant="outline" onClick={() => ref.current && printElement(ref.current, `Report card – ${data.card!.student.name}`)}>
          <Printer size={16} /> Print report card
        </Button>
      </div>
      <div ref={ref} className={cn('overflow-hidden rounded-2xl border border-border/70', loading && 'opacity-60')}>
        <ReportCardView card={data.card} />
      </div>
    </div>
  );
}

/** Staff view of a student's report card, opened from class results or the student profile. */
export function ReportCardDialog({ studentId, studentName, termId, onClose }: { studentId: string; studentName: string; termId?: string; onClose: () => void }) {
  const load = useCallback((term?: string) => examsApi.reportCard(studentId, term ?? termId), [studentId, termId]);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader icon={Trophy} tint="green">
          <DialogTitle>{studentName}</DialogTitle>
          <DialogDescription>Report card: every subject, total, grade and position in class.</DialogDescription>
        </DialogHeader>
        <ReportCardPanel load={load} emptyText="No marks have been entered for this student yet." />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
