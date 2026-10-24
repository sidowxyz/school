import { useEffect, useMemo, useState } from 'react';
import { ChartBar, CheckCircle, DownloadSimple, Exam, Trophy, UsersThree } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ErrorState, TableEmptyRow, TableLoadingRows } from '@/components/common/EmptyState';
import FilterSelect from '@/components/shared/FilterSelect';
import StatStrip from '@/components/shared/StatStrip';
import { cn } from '@/lib/utils';
import { downloadCSV } from '../../reports/utils/csv';
import type { Class, Section, Term } from '../../academic-structure/types';
import { examsApi, apiMessage } from '../api/examsApi';
import { formatPercent } from '../grading';
import type { ClassResults } from '../types';
import { GradeChip, ReportCardDialog } from './ReportCard';
import { termLabel } from './ExamsTab';

const sectionClassId = (s: Section) => (typeof s.class === 'string' ? s.class : s.class._id);

/** Medal tiles for the top three. */
const POSITION_TONE: Record<number, string> = { 1: 'bg-tile-yellow', 2: 'bg-tile-blue', 3: 'bg-tile-pink' };

export default function ResultsTab({ terms, classes, sections }: { terms: Term[]; classes: Class[]; sections: Section[] }) {
  const activeTerm = useMemo(() => terms.find((t) => t.status === 'active') ?? terms[0], [terms]);
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [results, setResults] = useState<ClassResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [card, setCard] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { if (!termId && activeTerm) setTermId(activeTerm._id); }, [activeTerm, termId]);
  const classSections = sections.filter((s) => sectionClassId(s) === classId);

  useEffect(() => {
    if (!termId || !classId) { setResults(null); return; }
    let cancelled = false;
    setLoading(true);
    examsApi.results({ termId, classId, sectionId })
      .then((res) => { if (!cancelled) { setResults(res); setError(''); } })
      .catch((err) => { if (!cancelled) { setResults(null); setError(apiMessage(err, 'Could not load the results.')); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [termId, classId, sectionId]);

  const top = results?.students.find((s) => s.position === 1);
  const exportCsv = () => {
    if (!results) return;
    downloadCSV(`results-${classes.find((c) => c._id === classId)?.cl_name ?? 'class'}`, results.students.map((r) => ({
      Position: r.position ?? '',
      Student: r.student.name,
      'Admission no.': r.student.admissionNumber ?? '',
      Section: r.student.section ?? '',
      ...Object.fromEntries(results.subjects.map((s) => [s.name, r.subjects[s._id]?.percent ?? ''])),
      'Total %': r.percent ?? '',
      Grade: r.grade?.grade ?? '',
    })));
  };

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect label="Term" value={termId} onChange={setTermId} className="w-60"
            options={terms.map((t) => ({ value: t._id, label: termLabel(t) }))} placeholder="Choose term" />
          <FilterSelect label="Class" value={classId} onChange={(v) => { setClassId(v); setSectionId(''); }} className="w-48"
            options={classes.map((c) => ({ value: c._id, label: c.cl_name }))} placeholder="Choose class" />
          <FilterSelect label="Section" value={sectionId} onChange={setSectionId} className="w-40" disabled={!classSections.length}
            options={[{ value: '', label: 'Whole class' }, ...classSections.map((s) => ({ value: s._id, label: s.name }))]} />
          {results && results.students.length > 0 && (
            <Button variant="outline" className="ml-auto" onClick={exportCsv}><DownloadSimple size={16} /> Export CSV</Button>
          )}
        </div>
      </Card>

      {!classId ? (
        <Card className="rounded-2xl"><EmptyState icon={ChartBar} tint="blue" title="Choose a class" text="See every student's marks, grade and position for the term." /></Card>
      ) : error ? (
        <Card className="rounded-2xl"><ErrorState text={error} /></Card>
      ) : (
        <>
          <StatStrip items={[
            { label: 'Students', value: results?.summary.students ?? '—', icon: UsersThree, tone: 'sky', hint: `${results?.summary.marked ?? 0} with marks` },
            { label: 'Class average', value: formatPercent(results?.summary.average), icon: ChartBar, tone: 'violet', hint: `${results?.exams.length ?? 0} exam${results?.exams.length === 1 ? '' : 's'} this term` },
            { label: 'Passed', value: results ? `${results.summary.passed} / ${results.summary.marked}` : '—', icon: CheckCircle, tone: 'emerald', hint: `${results?.passPercent ?? 50}% or more overall` },
            { label: 'Top student', value: top ? formatPercent(top.percent) : '—', icon: Trophy, tone: 'amber', hint: top?.student.name ?? 'No marks yet' },
          ]} />
          <Card className="overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="bg-muted/50 text-[11px] uppercase tracking-wider hover:bg-muted/50">
                    <TableHead className="w-16 pl-5 font-semibold">Pos.</TableHead>
                    <TableHead className="font-semibold">Student</TableHead>
                    {results?.subjects.map((s) => <TableHead key={s._id} className="text-center font-semibold">{s.code || s.name}</TableHead>)}
                    <TableHead className="text-center font-semibold">Total</TableHead>
                    <TableHead className="pr-5 text-center font-semibold">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !results ? <TableLoadingRows columns={6} avatar /> : !results?.students.length ? (
                    <TableEmptyRow colSpan={4 + (results?.subjects.length ?? 0)} icon={Exam} tint="green" title="No results yet"
                      text={results?.exams.length ? 'Marks show here as teachers enter them.' : 'There are no exams for this class in this term yet.'} />
                  ) : results.students.map((r) => (
                    <TableRow key={r.student._id} className={cn('cursor-pointer', loading && 'opacity-60')} onClick={() => setCard({ id: r.student._id, name: r.student.name })}>
                      <TableCell className="pl-5">
                        {r.position ? (
                          <span className={cn('inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-bold tabular-nums', POSITION_TONE[r.position] ? `${POSITION_TONE[r.position]} text-tile-foreground` : 'bg-muted text-foreground/80')}>
                            {r.position}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{r.student.name}</p>
                        <p className="text-xs text-muted-foreground">{[r.student.admissionNumber, r.student.section && `Section ${r.student.section}`].filter(Boolean).join(' · ')}</p>
                      </TableCell>
                      {results.subjects.map((s) => (
                        <TableCell key={s._id} className="text-center text-sm tabular-nums">{formatPercent(r.subjects[s._id]?.percent)}</TableCell>
                      ))}
                      <TableCell className="text-center font-semibold tabular-nums">{formatPercent(r.percent)}</TableCell>
                      <TableCell className="pr-5 text-center"><GradeChip grade={r.grade?.grade} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {!!results?.students.length && (
                  <TableFooter>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell className="pl-5" />
                      <TableCell className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject average</TableCell>
                      {results.subjects.map((s) => <TableCell key={s._id} className="text-center text-sm font-semibold tabular-nums">{formatPercent(s.average)}</TableCell>)}
                      <TableCell className="text-center font-semibold tabular-nums">{formatPercent(results.summary.average)}</TableCell>
                      <TableCell className="pr-5" />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
            {!!results?.students.length && <p className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">Click a student to open their report card.</p>}
          </Card>
        </>
      )}

      {card && <ReportCardDialog studentId={card.id} studentName={card.name} termId={termId} onClose={() => setCard(null)} />}
    </div>
  );
}
