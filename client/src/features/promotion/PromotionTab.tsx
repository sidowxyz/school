import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowCircleUp, ArrowsClockwise, CheckCircle, GraduationCap, Info, SpinnerGap, Student, UserMinus, UsersThree, WarningCircle,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, ListLoading, TableEmptyRow, TableLoadingRows } from '@/components/common/EmptyState';
import FilterSelect from '@/components/shared/FilterSelect';
import StatStrip from '@/components/shared/StatStrip';
import { useToast } from '@/hooks/use-toast';
import { academicApi } from '../academic-structure/api/academicApi';
import type { Year } from '../academic-structure/types';
import { promotionApi, type ClassAction, type PromotionPlan, type PromotionResult, type PromotionStudent, type StudentAction } from './promotionApi';

type Rule = { action: ClassAction; toClassId: string | null };

const apiMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const STUDENT_CHOICES: { value: StudentAction | ''; label: string }[] = [
  { value: '', label: 'Same as the class' },
  { value: 'promote', label: 'Move up' },
  { value: 'repeat', label: 'Repeat the class' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'leave', label: 'Leaving the school' },
];

/** Students of one class, each with an optional choice that differs from the class rule. */
function ExceptionsDrawer({ toYearId, cls, exceptions, onChange, onClose }: {
  toYearId: string; cls: { _id: string; name: string }; exceptions: Record<string, StudentAction>;
  onChange: (studentId: string, action: StudentAction | '') => void; onClose: () => void;
}) {
  const [students, setStudents] = useState<PromotionStudent[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    promotionApi.students(toYearId, cls._id).then(setStudents).catch((err) => setError(apiMessage(err, 'Could not load the students.')));
  }, [toYearId, cls._id]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader icon={UsersThree} tint="violet">
          <DialogTitle>{cls.name}: single students</DialogTitle>
          <DialogDescription>Everyone follows the class unless you choose something else here, e.g. one student repeats.</DialogDescription>
        </DialogHeader>
        {error ? <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : !students ? <ListLoading rows={5} /> : students.length === 0 ? (
          <EmptyState compact icon={CheckCircle} tint="green" title="Nobody left to move" text="Every student in this class is already in the new year." />
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border/70">
            {students.map((s) => (
              <li key={s._id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{[s.admissionNumber, s.section && `Section ${s.section}`].filter(Boolean).join(' · ')}</p>
                </div>
                <NativeSelect value={exceptions[s._id] ?? ''} onChange={(e) => onChange(s._id, e.target.value as StudentAction | '')}
                  aria-label={`What happens to ${s.name}`} className="h-9 w-44 rounded-lg text-sm">
                  {STUDENT_CHOICES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </NativeSelect>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PromotionTab() {
  const { showToast } = useToast();
  const [years, setYears] = useState<Year[]>([]);
  const [toYearId, setToYearId] = useState('');
  const [plan, setPlan] = useState<PromotionPlan | null>(null);
  const [rules, setRules] = useState<Record<string, Rule>>({});
  const [exceptions, setExceptions] = useState<Record<string, StudentAction>>({});
  const [exceptionsByClass, setExceptionsByClass] = useState<Record<string, string[]>>({});
  const [openClass, setOpenClass] = useState<{ _id: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PromotionResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    academicApi.getYears().then((list) => {
      setYears(list);
      // The newest year is usually the one students move into.
      const newest = [...list].sort((a, b) => b.y_no.localeCompare(a.y_no, undefined, { numeric: true }))[0];
      if (newest) setToYearId(newest._id);
    }).catch((err) => setError(apiMessage(err, 'Could not load the school years.')));
  }, []);

  const loadPlan = useCallback(async () => {
    if (!toYearId) return;
    try {
      const next = await promotionApi.plan(toYearId);
      setPlan(next);
      setRules(Object.fromEntries(next.classes.map((c) => [c._id, { ...c.suggestion }])));
      setExceptions({});
      setExceptionsByClass({});
      setError('');
    } catch (err) {
      setError(apiMessage(err, 'Could not load the classes.'));
    }
  }, [toYearId]);

  useEffect(() => { setPlan(null); setResult(null); void loadPlan(); }, [loadPlan]);

  const classes = plan?.classes ?? [];
  const pending = classes.filter((c) => c.waiting > 0);
  // Each class's students follow its rule, except those set apart.
  const totals = useMemo(() => {
    const t = { promote: 0, repeat: 0, graduate: 0, leave: 0 };
    for (const c of pending) {
      const classAction = rules[c._id]?.action ?? 'promote';
      const apart = exceptionsByClass[c._id] ?? [];
      t[classAction] += c.waiting - apart.length;
      for (const id of apart) {
        const own = exceptions[id];
        // Mirrors the server: "move up" from a class that doesn't move up follows the class.
        t[own === 'promote' && classAction !== 'promote' ? classAction : own] += 1;
      }
    }
    return t;
  }, [pending, rules, exceptions, exceptionsByClass]);
  const missingTarget = pending.some((c) => rules[c._id]?.action === 'promote' && !rules[c._id]?.toClassId);

  const setException = (classId: string, studentId: string, action: StudentAction | '') => {
    setExceptions((all) => {
      const next = { ...all };
      if (action) next[studentId] = action; else delete next[studentId];
      return next;
    });
    setExceptionsByClass((all) => {
      const list = new Set(all[classId] ?? []);
      if (action) list.add(studentId); else list.delete(studentId);
      return { ...all, [classId]: [...list] };
    });
  };

  const run = async () => {
    setRunning(true);
    try {
      const res = await promotionApi.run({
        toYearId,
        rules: pending.map((c) => ({ classId: c._id, ...rules[c._id] })),
        exceptions,
      });
      setResult(res);
      setConfirming(false);
      showToast(`Done: ${res.promoted} moved up, ${res.repeated} repeating, ${res.graduated} graduated.`);
      await loadPlan();
    } catch (err) {
      showToast(apiMessage(err, 'Could not move the students.'), 'error');
    } finally {
      setRunning(false);
    }
  };

  if (error && !plan) return <Card className="rounded-2xl"><EmptyState icon={WarningCircle} tint="pink" title="Couldn't load this" text={error} /></Card>;
  if (!years.length && !error) return <Card className="rounded-2xl"><ListLoading rows={4} /></Card>;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-tile-blue px-4 py-3 text-sm text-tile-foreground">
        <Info size={18} className="mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-semibold">Moving students into the next school year</p>
          <p className="opacity-80">
            First add the new year and its first term under <Link to="/academic-structure" className="font-medium underline">Academic structure</Link> and make that term active.
            Then choose what each class does and press <span className="font-medium">Move students</span>. Marks, attendance and fees from this year stay as history, and running it again never moves anyone twice.
          </p>
        </div>
      </div>

      <StatStrip items={[
        { label: 'Moving up', value: totals.promote, icon: ArrowCircleUp, tone: 'emerald', hint: 'To the next class' },
        { label: 'Repeating', value: totals.repeat, icon: ArrowsClockwise, tone: 'amber', hint: 'Same class again' },
        { label: 'Graduating', value: totals.graduate, icon: GraduationCap, tone: 'violet', hint: 'Leaving with a finished course' },
        { label: 'Already moved', value: classes.reduce((n, c) => n + c.alreadyMoved, 0), icon: CheckCircle, tone: 'sky', hint: plan ? `Into ${plan.year.name}` : '' },
      ]} />

      <Card className="overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border p-4">
          <FilterSelect label="Move students into" value={toYearId} onChange={setToYearId} className="w-60"
            options={years.map((y) => ({ value: y._id, label: y.y_name }))} placeholder="Choose school year" />
          <Button onClick={() => setConfirming(true)} disabled={!pending.length || missingTarget}>
            <ArrowCircleUp size={16} /> Move students
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-muted/50 text-[11px] uppercase tracking-wider hover:bg-muted/50">
                <TableHead className="pl-5 font-semibold">Class now</TableHead>
                <TableHead className="text-center font-semibold">To move</TableHead>
                <TableHead className="font-semibold">What happens</TableHead>
                <TableHead className="pr-5 text-right font-semibold">Single students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!plan ? <TableLoadingRows columns={4} rows={4} /> : classes.length === 0 ? (
                <TableEmptyRow colSpan={4} icon={Student} tint="blue" title="No classes yet" text="Add classes under Academic structure first." />
              ) : classes.map((c) => {
                const rule = rules[c._id] ?? c.suggestion;
                const done = c.waiting === 0;
                const extra = exceptionsByClass[c._id]?.length ?? 0;
                return (
                  <TableRow key={c._id} className={done ? 'opacity-60' : undefined}>
                    <TableCell className="py-3 pl-5">
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{[c.level, c.sections.length ? `Sections ${c.sections.map((s) => s.name).join(', ')}` : null].filter(Boolean).join(' · ')}</p>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {done
                        ? <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tile-green px-2.5 py-1 text-xs font-medium text-tile-foreground"><CheckCircle size={12} /> Done</span>
                        : <><span className="font-semibold">{c.waiting}</span>{c.alreadyMoved > 0 && <span className="block text-[11px] text-muted-foreground">{c.alreadyMoved} moved</span>}</>}
                    </TableCell>
                    <TableCell>
                      {!done && (
                        <div className="flex flex-wrap items-center gap-2">
                          <NativeSelect value={rule.action} aria-label={`What happens to ${c.name}`} className="h-9 w-40 rounded-lg text-sm"
                            onChange={(e) => setRules({ ...rules, [c._id]: { action: e.target.value as ClassAction, toClassId: e.target.value === 'promote' ? (rule.toClassId ?? c.suggestion.toClassId) : null } })}>
                            <option value="promote">Move up to</option>
                            <option value="repeat">Repeat {c.name}</option>
                            <option value="graduate">Graduate</option>
                          </NativeSelect>
                          {rule.action === 'promote' && (
                            <NativeSelect value={rule.toClassId ?? ''} aria-label={`${c.name} moves up to`} className="h-9 w-44 rounded-lg text-sm"
                              onChange={(e) => setRules({ ...rules, [c._id]: { action: 'promote', toClassId: e.target.value || null } })}>
                              <option value="">Choose class</option>
                              {classes.filter((k) => k._id !== c._id).map((k) => <option key={k._id} value={k._id}>{k.name}</option>)}
                            </NativeSelect>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      {!done && (
                        <Button variant={extra ? 'soft' : 'outline'} size="xs" onClick={() => setOpenClass({ _id: c._id, name: c.name })}>
                          <UserMinus size={13} /> {extra ? `${extra} set apart` : 'Set apart'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {result && (
        <Card className="space-y-2 rounded-2xl p-5">
          <p className="flex items-center gap-2 font-semibold text-foreground"><CheckCircle size={18} className="text-success" /> Students moved into {plan?.year.name}</p>
          <p className="text-sm text-muted-foreground">
            {result.promoted} moved up · {result.repeated} repeating · {result.graduated} graduated · {result.left} left the school{result.skipped ? ` · ${result.skipped} were already moved` : ''}
          </p>
          {result.warnings.map((w) => <p key={w} className="flex items-center gap-2 text-sm text-warning"><WarningCircle size={15} /> {w}</p>)}
        </Card>
      )}

      {openClass && (
        <ExceptionsDrawer toYearId={toYearId} cls={openClass} exceptions={exceptions}
          onChange={(studentId, action) => setException(openClass._id, studentId, action)} onClose={() => setOpenClass(null)} />
      )}

      {confirming && (
        <Dialog open onOpenChange={(open) => { if (!open && !running) setConfirming(false); }}>
          <DialogContent centered className="max-w-md">
            <DialogHeader icon={ArrowCircleUp} tint="green">
              <DialogTitle>Move students into {plan?.year.name}?</DialogTitle>
              <DialogDescription>
                {totals.promote} move up, {totals.repeat} repeat and {totals.graduate} graduate
                {totals.leave ? `, and ${totals.leave} leave the school` : ''}. Students who graduate or leave are marked that way and their portal login stops.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={running}>Cancel</Button>
              <Button onClick={() => void run()} disabled={running}>{running ? <SpinnerGap size={16} className="animate-spin" /> : <ArrowCircleUp size={16} />} {running ? 'Moving…' : 'Move students'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
