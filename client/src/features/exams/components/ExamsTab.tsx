import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Exam, EyeSlash, Megaphone, NotePencil, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormSection } from '@/components/ui/drawer-kit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableEmptyRow, TableLoadingRows } from '@/components/common/EmptyState';
import FilterSelect from '@/components/shared/FilterSelect';
import StatStrip from '@/components/shared/StatStrip';
import { useToast } from '@/hooks/use-toast';
import type { Class, Term } from '../../academic-structure/types';
import { examsApi, apiMessage } from '../api/examsApi';
import type { ExamInput, ExamItem } from '../types';

export const termLabel = (t: Term) => {
  const year = typeof t.academicYearId === 'object' ? t.academicYearId?.y_name : null;
  return year ? `${t.name} · ${year}` : t.name;
};

const formatDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date set');

function ExamForm({ initial, terms, classes, defaultTermId, onClose, onSaved }: {
  initial: ExamItem | null; terms: Term[]; classes: Class[]; defaultTermId: string; onClose: () => void; onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<ExamInput>({
    name: initial?.name ?? '',
    termId: initial?.termId ?? defaultTermId,
    maxMarks: initial?.maxMarks ?? 100,
    date: initial?.date ? initial.date.slice(0, 10) : null,
    classIds: initial?.classIds ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const allClasses = form.classIds.length === 0;

  const toggleClass = (id: string, on: boolean) =>
    setForm((f) => ({ ...f, classIds: on ? [...f.classIds, id] : f.classIds.filter((c) => c !== id) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (initial) await examsApi.update(initial._id, form);
      else await examsApi.create(form);
      showToast(initial ? `${form.name} saved.` : `${form.name} created. Teachers can now enter marks.`);
      onSaved();
    } catch (err) {
      setError(apiMessage(err, 'Could not save the exam.'));
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader icon={initial ? PencilSimple : Exam} tint="green">
          <DialogTitle>{initial ? 'Edit exam' : 'New exam'}</DialogTitle>
          <DialogDescription>Teachers enter one mark per student for each subject in this exam.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <FormSection title="Exam">
            <div className="space-y-1.5">
              <Label htmlFor="exam-name" className="text-xs font-semibold">Name *</Label>
              <Input id="exam-name" value={form.name} maxLength={80} required placeholder="e.g. Midterm, Final exam, Quiz 1"
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FilterSelect label="Term *" value={form.termId} onChange={(termId) => setForm({ ...form, termId })}
                options={terms.map((t) => ({ value: t._id, label: termLabel(t) }))} placeholder="Choose term" />
              <div className="space-y-1.5">
                <Label htmlFor="exam-max" className="text-xs font-medium text-muted-foreground">Marked out of *</Label>
                <Input id="exam-max" type="number" min={1} max={1000} required value={form.maxMarks}
                  onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Date (optional)</span>
              <DatePicker value={form.date ?? ''} onChange={(date) => setForm({ ...form, date: date || null })} clearable placeholder="Pick a date" aria-label="Exam date" />
            </div>
          </FormSection>
          <FormSection title="Classes sitting it" description="Leave all unticked for every class.">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={allClasses} onCheckedChange={(v) => v === true && setForm({ ...form, classIds: [] })} />
              Every class
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {classes.map((c) => (
                <label key={c._id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <Checkbox checked={form.classIds.includes(c._id)} onCheckedChange={(v) => toggleClass(c._id, v === true)} />
                  <span className="truncate">{c.cl_name}</span>
                </label>
              ))}
            </div>
          </FormSection>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.termId}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Create exam'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ExamsTab({ terms, classes, canManage, onEnterMarks }: {
  terms: Term[]; classes: Class[]; canManage: boolean; onEnterMarks: (exam: ExamItem) => void;
}) {
  const { showToast } = useToast();
  const activeTerm = useMemo(() => terms.find((t) => t.status === 'active') ?? terms[0], [terms]);
  const [termId, setTermId] = useState('');
  const [exams, setExams] = useState<ExamItem[] | null>(null);
  const [editing, setEditing] = useState<ExamItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ExamItem | null>(null);

  useEffect(() => { if (!termId && activeTerm) setTermId(activeTerm._id); }, [activeTerm, termId]);

  const load = useCallback(async () => {
    try {
      setExams(await examsApi.list(termId ? { termId } : {}));
    } catch (err) {
      showToast(apiMessage(err, 'Could not load exams.'), 'error');
      setExams([]);
    }
  }, [termId, showToast]);

  useEffect(() => { void load(); }, [load]);

  const togglePublish = async (exam: ExamItem) => {
    try {
      await examsApi.publish(exam._id, !exam.published);
      showToast(exam.published ? `${exam.name} hidden from students and parents.` : `${exam.name} published. Students and parents can see it now.`);
      void load();
    } catch (err) {
      showToast(apiMessage(err, 'Could not change this exam.'), 'error');
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await examsApi.remove(deleting._id);
      showToast(`${deleting.name} deleted.`);
      setDeleting(null);
      void load();
    } catch (err) {
      showToast(apiMessage(err, 'Could not delete this exam.'), 'error');
      setDeleting(null);
    }
  };

  const list = exams ?? [];
  return (
    <div className="space-y-5">
      <StatStrip items={[
        { label: 'Exams', value: list.length, icon: Exam, tone: 'sky', hint: termId ? 'In this term' : 'All terms' },
        { label: 'Published', value: list.filter((e) => e.published).length, icon: Megaphone, tone: 'emerald', hint: 'Visible to students and parents' },
        { label: 'Marks entered', value: list.reduce((n, e) => n + e.progress.marks, 0), icon: NotePencil, tone: 'violet', hint: 'Across these exams' },
      ]} />

      <Card className="overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border p-4">
          <FilterSelect label="Term" value={termId} onChange={setTermId} className="w-64"
            options={[{ value: '', label: 'All terms' }, ...terms.map((t) => ({ value: t._id, label: termLabel(t) }))]} />
          {canManage && <Button onClick={() => setEditing('new')} disabled={!terms.length}><Plus size={16} /> New exam</Button>}
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-muted/50 text-[11px] uppercase tracking-wider hover:bg-muted/50">
                <TableHead className="min-w-[220px] pl-5 font-semibold">Exam</TableHead>
                <TableHead className="font-semibold">Classes</TableHead>
                <TableHead className="text-center font-semibold">Out of</TableHead>
                <TableHead className="text-center font-semibold">Marks entered</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="pr-5 text-right font-semibold"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams === null ? <TableLoadingRows columns={6} rows={3} /> : list.length === 0 ? (
                <TableEmptyRow colSpan={6} icon={Exam} tint="green" title="No exams yet"
                  text={terms.length ? 'Create the exams for this term (e.g. Midterm and Final). Teachers then enter marks for their classes.' : 'Add a school year and term under Settings › Academic structure first.'}
                  action={canManage && terms.length > 0 && <Button onClick={() => setEditing('new')}><Plus size={16} /> New exam</Button>} />
              ) : list.map((exam) => (
                <TableRow key={exam._id}>
                  <TableCell className="py-3.5 pl-5">
                    <p className="font-semibold text-foreground">{exam.name}</p>
                    <p className="text-xs text-muted-foreground">{exam.term ? `${exam.term.name}${exam.term.year ? ` · ${exam.term.year}` : ''}` : ''} · {formatDay(exam.date)}</p>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                    {exam.classes.length ? exam.classes.map((c) => c.name).join(', ') : 'Every class'}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{exam.maxMarks}</TableCell>
                  <TableCell className="text-center tabular-nums">{exam.progress.marks}<span className="block text-[11px] text-muted-foreground">{exam.progress.students} students</span></TableCell>
                  <TableCell>
                    {exam.published
                      ? <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tile-green px-2.5 py-1 text-xs font-medium text-tile-foreground"><CheckCircle size={12} /> Published</span>
                      : <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"><EyeSlash size={12} /> Draft</span>}
                  </TableCell>
                  <TableCell className="pr-5">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="xs" onClick={() => onEnterMarks(exam)}><NotePencil size={13} /> Marks</Button>
                      {canManage && (
                        <>
                          <Button variant={exam.published ? 'ghost' : 'soft'} size="xs" onClick={() => void togglePublish(exam)}>
                            {exam.published ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(exam)} aria-label={`Edit ${exam.name}`}><PencilSimple size={15} /></Button>
                          <Button variant="ghost" size="icon-sm" className="hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleting(exam)} aria-label={`Delete ${exam.name}`}><Trash size={15} /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {editing && (
        <ExamForm initial={editing === 'new' ? null : editing} terms={terms} classes={classes} defaultTermId={termId || activeTerm?._id || ''}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />
      )}
      {deleting && (
        <Dialog open onOpenChange={(open) => { if (!open) setDeleting(null); }}>
          <DialogContent centered className="max-w-md">
            <DialogHeader icon={Trash} tint="pink">
              <DialogTitle>Delete {deleting.name}?</DialogTitle>
              <DialogDescription>Only an exam with no marks entered can be deleted.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleting(null)}>Keep it</Button>
              <Button variant="destructive" onClick={() => void remove()}>Delete exam</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
