import { useEffect, useMemo, useRef, useState } from 'react';
import { FloppyDisk, LockSimple, NotePencil, SpinnerGap, UsersThree } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, TableEmptyRow, TableLoadingRows } from '@/components/common/EmptyState';
import FilterSelect from '@/components/shared/FilterSelect';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { examsApi, apiMessage } from '../api/examsApi';
import { formatPercent, gradeLetter } from '../grading';
import type { ExamItem, MarkRow, Marksheet, MarkingOptions } from '../types';
import { GradeChip } from './ReportCard';

type Draft = { score: string; absent: boolean; remark: string };
const toDraft = (r: MarkRow): Draft => ({ score: r.score === null ? '' : String(r.score), absent: r.absent, remark: r.remark });

export default function MarkEntryTab({ exams, examId, onExamChange }: {
  exams: ExamItem[]; examId: string; onExamChange: (id: string) => void;
}) {
  const { showToast } = useToast();
  const [options, setOptions] = useState<MarkingOptions | null>(null);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [sheet, setSheet] = useState<Marksheet | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // What this person may mark in the chosen exam.
  useEffect(() => {
    setOptions(null); setSheet(null); setClassId(''); setSectionId(''); setSubjectId('');
    if (!examId) return;
    examsApi.options(examId).then(setOptions).catch((err) => showToast(apiMessage(err, 'Could not load your classes.'), 'error'));
  }, [examId, showToast]);

  const pairs = options?.pairs ?? null;
  const classOptions = options?.classes ?? [];
  const sectionOptions = useMemo(() => (options?.sections ?? []).filter((s) => s.classId === classId
    && (!pairs || pairs.some((p) => p.classId === classId && p.sectionId === s._id))), [options, classId, pairs]);
  const subjectOptions = useMemo(() => (options?.subjects ?? []).filter((s) => {
    if (pairs) return pairs.some((p) => p.classId === classId && (!sectionId || p.sectionId === sectionId) && p.subjectId === s._id);
    return !s.classId || s.classId === classId;
  }), [options, classId, sectionId, pairs]);
  const needsSection = sectionOptions.length > 0;
  const ready = !!examId && !!classId && !!subjectId && (!needsSection || !!sectionId);

  // Pick the only choice automatically (a teacher with one class, etc.).
  useEffect(() => { if (!classId && classOptions.length === 1) setClassId(classOptions[0]._id); }, [classOptions, classId]);
  useEffect(() => { if (!sectionId && sectionOptions.length === 1) setSectionId(sectionOptions[0]._id); }, [sectionOptions, sectionId]);
  useEffect(() => { if (!subjectId && subjectOptions.length === 1) setSubjectId(subjectOptions[0]._id); }, [subjectOptions, subjectId]);

  useEffect(() => {
    if (!ready) { setSheet(null); return; }
    let cancelled = false;
    setLoading(true);
    examsApi.marksheet(examId, { classId, sectionId, subjectId })
      .then((res) => {
        if (cancelled) return;
        setSheet(res);
        setDrafts(Object.fromEntries(res.rows.map((r) => [r.studentId, toDraft(r)])));
      })
      .catch((err) => { if (!cancelled) showToast(apiMessage(err, 'Could not load the mark sheet.'), 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ready, examId, classId, sectionId, subjectId, showToast]);

  const max = sheet?.exam.maxMarks ?? 100;
  const locked = !!sheet?.locked;
  const changed = useMemo(() => (sheet?.rows ?? []).filter((r) => {
    const d = drafts[r.studentId];
    const o = toDraft(r);
    return d && (d.score !== o.score || d.absent !== o.absent || d.remark !== o.remark);
  }), [sheet, drafts]);
  const invalid = (d?: Draft) => !!d && !d.absent && d.score !== '' && (Number.isNaN(Number(d.score)) || Number(d.score) < 0 || Number(d.score) > max);
  const anyInvalid = Object.values(drafts).some(invalid);

  // Absent counts as 0, the same as on results and report cards.
  const scored = Object.values(drafts).filter((d) => d.absent || (d.score !== '' && !invalid(d)));
  const average = scored.length ? (scored.reduce((n, d) => n + (d.absent ? 0 : Number(d.score)), 0) / scored.length / max) * 100 : null;
  const marked = Object.values(drafts).filter((d) => d.absent || (d.score !== '' && !invalid(d))).length;

  const setDraft = (id: string, patch: Partial<Draft>) => setDrafts((all) => ({ ...all, [id]: { ...all[id], ...patch } }));

  const save = async () => {
    if (!sheet || !changed.length) return;
    setSaving(true);
    try {
      const marks = changed.map((r) => {
        const d = drafts[r.studentId];
        return { studentId: r.studentId, score: d.absent || d.score === '' ? null : Number(d.score), absent: d.absent, remark: d.remark };
      });
      await examsApi.saveMarks(examId, { classId, sectionId, subjectId }, marks);
      showToast(`${marks.length} mark${marks.length === 1 ? '' : 's'} saved.`);
      const fresh = await examsApi.marksheet(examId, { classId, sectionId, subjectId });
      setSheet(fresh);
      setDrafts(Object.fromEntries(fresh.rows.map((r) => [r.studentId, toDraft(r)])));
    } catch (err) {
      showToast(apiMessage(err, 'Could not save the marks.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Enter moves down the list, like a spreadsheet.
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Enter') { e.preventDefault(); inputs.current[i + 1]?.focus(); inputs.current[i + 1]?.select(); }
  };

  return (
    <div className="space-y-5">
      <Card className="rounded-2xl p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Exam" value={examId} onChange={onExamChange} placeholder="Choose exam"
            options={exams.map((e) => ({ value: e._id, label: `${e.name}${e.term ? ` · ${e.term.name}` : ''}` }))} />
          <FilterSelect label="Class" value={classId} onChange={(v) => { setClassId(v); setSectionId(''); setSubjectId(''); }} placeholder="Choose class"
            disabled={!options} options={classOptions.map((c) => ({ value: c._id, label: c.name }))} />
          <FilterSelect label="Section" value={sectionId} onChange={(v) => { setSectionId(v); setSubjectId(''); }}
            placeholder={classId && !needsSection ? 'No sections' : 'Choose section'} disabled={!needsSection}
            options={sectionOptions.map((s) => ({ value: s._id, label: s.name }))} />
          <FilterSelect label="Subject" value={subjectId} onChange={setSubjectId} placeholder="Choose subject" disabled={!classId}
            options={subjectOptions.map((s) => ({ value: s._id, label: s.name }))} />
        </div>
      </Card>

      {!examId ? (
        <Card className="rounded-2xl"><EmptyState icon={NotePencil} tint="green" title="Choose an exam" text={exams.length ? 'Then pick the class and subject you want to enter marks for.' : 'No exams yet. The academic office creates them on the Exams tab.'} /></Card>
      ) : options && pairs?.length === 0 ? (
        <Card className="rounded-2xl"><EmptyState icon={UsersThree} tint="yellow" title="No classes to mark" text="You aren't assigned to a class in this exam. Ask the academic office to add you to the timetable." /></Card>
      ) : !ready ? (
        <Card className="rounded-2xl"><EmptyState icon={NotePencil} tint="blue" title="Pick a class and subject" text="The class list opens here, ready for marks." /></Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl">
          {locked && (
            <div className="flex items-center gap-2 border-b border-border bg-tile-yellow px-4 py-2.5 text-sm text-tile-foreground">
              <LockSimple size={16} /> These results are published, so marks can't be changed. Ask the academic office to unpublish them first.
            </div>
          )}
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="bg-muted/50 text-[11px] uppercase tracking-wider hover:bg-muted/50">
                  <TableHead className="w-12 pl-5 font-semibold">#</TableHead>
                  <TableHead className="font-semibold">Student</TableHead>
                  <TableHead className="w-40 font-semibold">Mark (out of {max})</TableHead>
                  <TableHead className="w-24 text-center font-semibold">Absent</TableHead>
                  <TableHead className="w-20 text-center font-semibold">Grade</TableHead>
                  <TableHead className="pr-5 font-semibold">Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !sheet ? <TableLoadingRows columns={6} avatar={false} /> : !sheet?.rows.length ? (
                  <TableEmptyRow colSpan={6} icon={UsersThree} tint="blue" title="No students in this class" text="Students registered in this class and section appear here." />
                ) : sheet.rows.map((r, i) => {
                  const d = drafts[r.studentId] ?? toDraft(r);
                  const bad = invalid(d);
                  const pct = !d.absent && d.score !== '' && !bad ? (Number(d.score) / max) * 100 : d.absent ? 0 : null;
                  return (
                    <TableRow key={r.studentId} className={cn(loading && 'opacity-60')}>
                      <TableCell className="pl-5 text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.admissionNumber}</p>
                      </TableCell>
                      <TableCell>
                        <Input ref={(el) => { inputs.current[i] = el; }} type="number" inputMode="decimal" min={0} max={max} step="0.5"
                          value={d.absent ? '' : d.score} disabled={locked || d.absent} placeholder={d.absent ? 'Absent' : '—'}
                          aria-label={`Mark for ${r.name}`} aria-invalid={bad}
                          className={cn('h-9 w-28 tabular-nums', bad && 'border-destructive focus-visible:ring-destructive')}
                          onChange={(e) => setDraft(r.studentId, { score: e.target.value })} onKeyDown={(e) => onKey(e, i)} />
                        {bad && <p className="mt-1 text-[11px] text-destructive">0 to {max}</p>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox checked={d.absent} disabled={locked} aria-label={`${r.name} was absent`}
                          onCheckedChange={(v) => setDraft(r.studentId, { absent: v === true, score: v === true ? '' : d.score })} />
                      </TableCell>
                      <TableCell className="text-center"><GradeChip grade={gradeLetter(pct)} /></TableCell>
                      <TableCell className="pr-5">
                        <Input value={d.remark} maxLength={200} disabled={locked} placeholder="Optional" aria-label={`Remark for ${r.name}`}
                          className="h-9" onChange={(e) => setDraft(r.studentId, { remark: e.target.value })} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {!!sheet?.rows.length && (
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card/95 px-5 py-3 backdrop-blur">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{marked}</span> of {sheet.rows.length} marked · class average <span className="font-semibold text-foreground">{formatPercent(average === null ? null : Math.round(average * 10) / 10)}</span>
                {changed.length > 0 && <span className="ml-2 rounded-full bg-tile-yellow px-2 py-0.5 text-xs font-medium text-tile-foreground">{changed.length} unsaved</span>}
              </p>
              <Button onClick={() => void save()} disabled={locked || saving || !changed.length || anyInvalid}>
                {saving ? <SpinnerGap size={16} className="animate-spin" /> : <FloppyDisk size={16} />} {saving ? 'Saving…' : 'Save marks'}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
