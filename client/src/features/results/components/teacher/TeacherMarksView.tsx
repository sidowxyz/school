import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, FloppyDisk, Warning, Users, ClipboardText, PaperPlaneRight, ClipboardText, ArrowCounterClockwise, Cloud, ArrowCounterClockwise, BookOpen } from '@phosphor-icons/react';

import FilterSelect from '@/components/shared/FilterSelect';
import GradeBadge from '../shared/GradeBadge';
import StatStrip from '@/components/shared/StatStrip';
import SubmissionStatusPill from '../shared/SubmissionStatusPill';
import { SkeletonTable } from '../shared/Skeleton';
import { resultsApi } from '../../api/resultsApi';
import { useResultScope } from '../../hooks/useResultScope';
import { gradeFor, PASS_PERCENTAGE } from '../../data/gradeBands';
import type { MarkSubmission, StudentMarkEntry } from '../../types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const refId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String((value as { _id?: string })._id ?? '');
};

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export default function TeacherMarksView() {
  const scopeState = useResultScope();
  const { scopeOptions, scope, setScope, classOptions, classId, setClassId, examsInScope } = scopeState;

  // Within a scope + class, the pickable unit is an actual scheduled exam
  const examOptions = useMemo(
    () =>
      examsInScope.map((exam) => ({
        value: exam._id,
        label:
          typeof exam.subject_id === 'object'
            ? `${exam.subject_id.sub_name} — ${exam.name}`
            : exam.name,
      })),
    [examsInScope],
  );

  const [examId, setExamId] = useState('');

  useEffect(() => {
    setExamId((current) =>
      examOptions.some((o) => o.value === current) ? current : examOptions[0]?.value ?? '',
    );
  }, [examOptions]);

  const selectedExam = examsInScope.find((e) => e._id === examId);
  const subjectId = refId(selectedExam?.subject_id);
  const examClassId = refId(selectedExam?.class_id) || classId;

  const [submission, setSubmission] = useState<MarkSubmission | null>(null);
  const [entries, setEntries] = useState<StudentMarkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const canLoad = Boolean(examId && examClassId && subjectId);

  // Load marks sheet
  useEffect(() => {
    if (!canLoad) {
      setSubmission(null);
      setEntries([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSavedAt(null);

    resultsApi
      .getSubmission({ exam_id: examId, class_id: examClassId, subject_id: subjectId })
      .then((result) => {
        if (cancelled) return;
        setSubmission(result);
        setEntries(result.entries.map((e) => ({ ...e })));
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load the marks sheet.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [examId, examClassId, subjectId, canLoad]);

  const maxMarks = submission?.maxMarks ?? 100;
  const passMark = submission?.passMarks ?? Math.round((PASS_PERCENTAGE / 100) * maxMarks);
  const status = submission?.status ?? 'draft';
  const editable = status === 'draft' || status === 'returned';

  const update = (id: string, patch: Partial<StudentMarkEntry>) => {
    if (!editable) return;
    setEntries((prev) => prev.map((e) => (e.studentId === id ? { ...e, ...patch } : e)));
  };

  const stats = useMemo(() => {
    const entered = entries.Funnel((e) => e.marks !== null).length;
    const invalid = entries.Funnel((e) => e.marks !== null && (e.marks < 0 || e.marks > maxMarks)).length;
    const valid = entries.Funnel((e) => e.marks !== null && e.marks >= 0 && e.marks <= maxMarks);
    const passing = valid.Funnel((e) => e.marks! >= passMark).length;
    const avg = valid.length
      ? Math.round((valid.reduce((a, e) => a + e.marks!, 0) / valid.length) * 10) / 10
      : 0;
    return { entered, invalid, passing, avg, total: entries.length };
  }, [entries, maxMarks, passMark]);

  const canSubmit = stats.total > 0 && stats.entered === stats.total && stats.invalid === 0;

  const persist = async (nextStatus: 'draft' | 'submitted') => {
    if (!canLoad) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await resultsApi.save({
        exam_id: examId,
        class_id: examClassId,
        subject_id: subjectId,
        entries: entries.map((e) => ({
          studentId: e.studentId,
          marks: e.marks,
          remarks: e.remarks,
        })),
        status: nextStatus,
      });
      setSubmission(saved);
      setEntries(saved.entries.map((e) => ({ ...e })));
      setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setError(errorMessage(err, 'Failed to FloppyDisk marks.'));
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
  };

  const applyPaste = () => {
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).Funnel(Boolean);
    setEntries((prev) => {
      const next = prev.map((e) => ({ ...e }));
      lines.forEach((line, i) => {
        const parts = line.split(/[\t,;]|\s{2,}|\s+/).Funnel(Boolean);
        let roll: string | null = null;
        let mark: number | null = null;
        if (parts.length >= 2) {
          roll = parts[0];
          mark = Number(parts[parts.length - 1]);
        } else {
          mark = Number(parts[0]);
        }
        if (Number.isNaN(mark!)) return;
        const target = roll
          ? next.find((e) => e.rollNo.toLowerCase() === roll!.toLowerCase())
          : next[i];
        if (target) target.marks = mark;
      });
      return next;
    });
    setShowPaste(false);
    setPasteText('');
  };

  if (scopeState.loading) return <SkeletonTable rows={8} />;

  if (scopeOptions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 pb-4 border-b border-border/80">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Marks Entry</h1>
          <p className="text-xs text-muted-foreground">Enter and submit subject marks for your assigned classes</p>
        </div>
        <EmptyPanel
          title="No examinations scheduled yet"
          body="Marks entry opens once academic staff have scheduled examinations for your classes."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clean Simplified Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Marks Entry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enter and submit subject marks for your assigned classes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SubmissionStatusPill status={status} />
        </div>
      </div>

      {(error || scopeState.error) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs sm:text-sm font-medium text-destructive">
          {error ?? scopeState.error}
        </div>
      )}

      {/* Returned banner */}
      {status === 'returned' && submission?.returnReason && (
        <Card className="border-amber-200/80 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 flex items-center justify-center shrink-0">
            <ArrowCounterClockwise size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Returned by the academic officer</p>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 mt-0.5">{submission.returnReason}</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400 mt-1">Make the corrections below and resubmit for approval.</p>
          </div>
        </Card>
      )}

      {/* Filters + actions Card */}
      <Card className="p-4 border-border/80 shadow-xs">
        <div className="flex flex-col xl:flex-row gap-4 xl:items-end xl:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <FilterSelect
              label="Examination"
              value={scope}
              onChange={setScope}
              options={scopeOptions}
              className="min-w-[220px]"
            />
            <FilterSelect
              label="Class"
              value={classId}
              onChange={setClassId}
              options={classOptions}
              className="min-w-[150px]"
            />
            <FilterSelect
              label="Subject"
              value={examId}
              onChange={setExamId}
              options={
                examOptions.length
                  ? examOptions
                  : [{ value: '', label: 'No examinations for this class' }]
              }
              className="min-w-[200px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPaste((v) => !v)}
              disabled={!editable || !canLoad}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <ClipboardText size={14} /> Paste from Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => persist('draft')}
              disabled={!editable || !canLoad || saving}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <FloppyDisk size={14} /> {saving ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => persist('submitted')}
              disabled={!canSubmit || !editable || saving}
              title={!canSubmit ? 'Enter valid marks for all students first' : undefined}
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
            >
              {status === 'returned' ? (
                <><ArrowCounterClockwise size={14} /> Resubmit</>
              ) : (
                <><PaperPlaneRight size={14} /> Submit for Approval</>
              )}
            </Button>
          </div>
        </div>

        {showPaste && editable && (
          <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground mb-2">
              Paste one student per line — either just the mark (in roster order) or{' '}
              <code className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded">RollNo, Mark</code>. Tabs, commas or spaces are accepted.
            </p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={4}
              className="w-full text-xs font-mono bg-background border-border/80"
              placeholder="e.g.&#10;101, 85&#10;102, 92"
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowPaste(false); setPasteText(''); }}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyPaste}
                disabled={!pasteText.trim()}
                className="h-8 text-xs font-semibold"
              >
                Apply Marks
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Progress summary */}
      <StatStrip
        items={[
          { label: 'Total students', value: `${stats.total}`, icon: Users, tone: 'sky' },
          { label: 'Marks entered', value: `${stats.entered}/${stats.total}`, icon: ClipboardText, tone: 'violet' },
          { label: 'Passing', value: `${stats.passing}`, icon: CheckCircle, tone: 'emerald' },
          { label: 'Invalid entries', value: `${stats.invalid}`, icon: Warning, tone: stats.invalid ? 'rose' : 'muted' },
        ]}
      />

      {/* Marks table */}
      {loading ? (
        <SkeletonTable rows={8} />
      ) : !canLoad ? (
        <EmptyPanel
          title="No examination selected"
          body="Pick an examination, class and subject above to start entering marks."
        />
      ) : entries.length === 0 ? (
        <EmptyPanel
          title="No students in this class"
          body="Enrol students into this class before entering marks for it."
        />
      ) : (
        <Card className="overflow-hidden border-border/80 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {submission?.examName} · {submission?.className} · {submission?.subjectName}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Out of {maxMarks} marks · pass mark {passMark}
              </p>
            </div>
            {savedAt && editable && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Cloud size={13} /> Saved at {savedAt}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <Table className="w-full min-w-[820px] text-sm">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/30">
                  <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">Roll No.</TableHead>
                  <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student Name</TableHead>
                  <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center w-[130px]">Marks (/{maxMarks})</TableHead>
                  <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center w-[100px]">Grade</TableHead>
                  <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center w-[100px]">Result</TableHead>
                  <TableHead className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e, i) => {
                  const hasMark = e.marks !== null;
                  const invalid = hasMark && (e.marks! < 0 || e.marks! > maxMarks);
                  const pct = hasMark && !invalid ? (e.marks! / maxMarks) * 100 : null;
                  const pass = hasMark && !invalid && e.marks! >= passMark;
                  return (
                    <TableRow key={e.studentId} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                      <TableCell className="px-5 py-3 font-mono text-xs text-muted-foreground font-medium">{e.rollNo}</TableCell>
                      <TableCell className="px-5 py-3 text-sm font-semibold text-foreground tracking-tight">{e.name}</TableCell>
                      <TableCell className="px-5 py-3 text-center">
                        <Input
                          ref={(el) => { inputRefs.current[i] = el; }}
                          type="number"
                          min={0}
                          max={maxMarks}
                          value={e.marks ?? ''}
                          disabled={!editable}
                          onKeyDown={(ev) => onKeyDown(ev, i)}
                          onChange={(ev) =>
                            update(e.studentId, {
                              marks: ev.target.value === '' ? null : Number(ev.target.value),
                            })
                          }
                          placeholder="—"
                          className={`w-20 mx-auto text-center h-8 text-xs rounded-lg transition font-semibold ${
                            invalid
                              ? 'border-destructive focus:ring-destructive bg-destructive/10 text-destructive'
                              : 'bg-background border-border/80 focus:border-primary'
                          }`}
                        />
                      </TableCell>
                      <TableCell className="px-5 py-3 text-center">
                        {pct !== null ? <GradeBadge grade={gradeFor(pct)} /> : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-center">
                        {invalid ? (
                          <span className="text-xs font-semibold text-destructive">Invalid</span>
                        ) : hasMark ? (
                          <span className={`text-xs font-semibold ${pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {pass ? 'Pass' : 'Fail'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <Input
                          type="text"
                          value={e.remarks}
                          disabled={!editable}
                          onChange={(ev) => update(e.studentId, { remarks: ev.target.value })}
                          placeholder="Optional remarks"
                          className="w-full h-8 text-xs bg-background border-border/80 focus:border-primary"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-border bg-muted/20 text-xs">
            <p className="text-muted-foreground">
              Class average so far:{' '}
              <span className="font-semibold text-foreground">{stats.avg || '—'}</span>
              {stats.avg ? ` / ${maxMarks}` : ''}
            </p>
            {!editable ? (
              <p className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle size={14} /> {status === 'published' ? 'Published' : `Marks ${status}`}
              </p>
            ) : (
              <p className="text-muted-foreground">
                {stats.total - stats.entered} students remaining · press Enter to move down
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <Card className="border-border/80 shadow-xs p-12 text-center flex flex-col items-center">
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 ring-1 ring-border/60">
        <BookOpen className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{body}</p>
    </Card>
  );
}
