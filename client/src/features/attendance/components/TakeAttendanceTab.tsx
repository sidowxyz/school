import { useEffect, useMemo, useState } from 'react';
import { Checks, FloppyDisk, SpinnerGap, UsersThree } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  attendanceService, sectionClassId, ATTENDANCE_STATUSES,
  type AttendanceStatusName, type ClassData, type Period, type SectionData, type Student, type Term,
} from '../../../services/attendance.service';
import { STATUS_STYLE } from '../statusStyles';

type Mark = { status: AttendanceStatusName; remarks: string };

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const recordStudentId = (r: { studentId: Student | string }) => (typeof r.studentId === 'object' ? r.studentId._id : r.studentId);

export default function TakeAttendanceTab({ terms, classes, sections }: { terms: Term[]; classes: ClassData[]; sections: SectionData[] }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayIso());
  const [termId, setTermId] = useState(() => (terms.find((t) => t.status === 'active') ?? terms[0])?._id ?? '');
  const [classId, setClassId] = useState(classes[0]?._id ?? '');
  const classSections = useMemo(() => sections.filter((s) => sectionClassId(s) === classId), [sections, classId]);
  const [sectionId, setSectionId] = useState('');
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // A class with sections starts on its first section.
  useEffect(() => { setSectionId(classSections[0]?._id ?? ''); }, [classSections]);

  useEffect(() => {
    if (!termId) { setPeriods([]); setPeriodId(''); return; }
    let cancelled = false;
    attendanceService.getPeriods(termId)
      .then((list) => { if (!cancelled) { setPeriods(list); setPeriodId(list[0]?._id ?? ''); } })
      .catch(() => { if (!cancelled) setPeriods([]); });
    return () => { cancelled = true; };
  }, [termId]);

  // Roster and any marks already saved for this period/day, fetched together.
  useEffect(() => {
    if (!classId || (classSections.length > 0 && !sectionId)) { setStudents([]); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      attendanceService.getEnrolledStudents(classId, sectionId),
      periodId
        ? attendanceService.getStudentAttendance({ classId, sectionId: sectionId || undefined, date, periodId, limit: 500 })
        : Promise.resolve([]),
    ])
      .then(([roster, saved]) => {
        if (cancelled) return;
        const savedBy = new Map(saved.map((r) => [recordStudentId(r), r]));
        roster.sort((x, y) => `${x.firstName} ${x.lastName}`.localeCompare(`${y.firstName} ${y.lastName}`));
        setStudents(roster);
        setMarks(Object.fromEntries(roster.map((s) => {
          const r = savedBy.get(s._id);
          return [s._id, { status: r?.status ?? 'Present', remarks: r?.remarks ?? '' }];
        })));
        setAlreadySaved(saved.length > 0);
        setDirty(false);
      })
      .catch(() => { if (!cancelled) showToast('Could not load this class.', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [classId, sectionId, classSections.length, periodId, date, showToast]);

  const setMark = (id: string, patch: Partial<Mark>) => {
    setMarks((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
    setDirty(true);
  };

  const markAll = (status: AttendanceStatusName) => {
    setMarks((m) => Object.fromEntries(students.map((s) => [s._id, { status, remarks: m[s._id]?.remarks ?? '' }])));
    setDirty(true);
  };

  const save = async () => {
    if (!periodId) { showToast('Choose a period first.', 'error'); return; }
    setSaving(true);
    try {
      await attendanceService.saveStudentAttendance({
        periodId,
        att_date: date,
        attendance: students.map((s) => ({ studentId: s._id, status: marks[s._id].status, remarks: marks[s._id].remarks || undefined })),
      });
      setAlreadySaved(true);
      setDirty(false);
      showToast(`Attendance saved for ${students.length} students.`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Could not save attendance.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const counts = ATTENDANCE_STATUSES.map((st) => ({ st, n: students.filter((s) => marks[s._id]?.status === st).length }));

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/70 shadow-none">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="ta-date" className="text-xs">Date</Label>
            <Input id="ta-date" type="date" value={date} max={todayIso()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          {terms.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="ta-term" className="text-xs">Term</Label>
              <NativeSelect id="ta-term" value={termId} onChange={(e) => setTermId(e.target.value)}>
                {terms.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </NativeSelect>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ta-class" className="text-xs">Class</Label>
            <NativeSelect id="ta-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.length === 0 && <option value="">No classes yet</option>}
              {classes.map((c) => <option key={c._id} value={c._id}>{c.cl_name}</option>)}
            </NativeSelect>
          </div>
          {classSections.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="ta-section" className="text-xs">Section</Label>
              <NativeSelect id="ta-section" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                {classSections.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </NativeSelect>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ta-period" className="text-xs">Period</Label>
            <NativeSelect id="ta-period" value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
              {periods.length === 0 && <option value="">No periods for this term</option>}
              {periods.map((p) => <option key={p._id} value={p._id}>{p.per_name}{p.time_in ? ` · ${p.time_in}` : ''}</option>)}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {counts.map(({ st, n }) => (
              <span key={st} className={cn('rounded-full px-2.5 py-1 font-medium', STATUS_STYLE[st].pill)}>{n} {st.toLowerCase()}</span>
            ))}
            {alreadySaved && !dirty && <span className="text-muted-foreground">· saved</span>}
            {dirty && <span className="text-warning">· not saved yet</span>}
          </div>
          <Button variant="outline" size="sm" onClick={() => markAll('Present')} disabled={!students.length} className="h-8 gap-1.5">
            <Checks size={14} /> All present
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><SpinnerGap size={24} className="animate-spin text-primary" /></div>
        ) : students.length === 0 ? (
          <EmptyState icon={UsersThree} text={classes.length ? 'No active students in this class.' : 'Add classes and students first.'} />
        ) : (
          <ul className="divide-y divide-border">
            {students.map((s, i) => {
              const m = marks[s._id];
              return (
                <li key={s._id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <div className="min-w-[140px] flex-1">
                    <p className="truncate text-sm font-medium">{s.firstName} {s.lastName}</p>
                    <p className="text-xs text-muted-foreground">{s.admissionNumber}</p>
                  </div>
                  {m && m.status !== 'Present' && (
                    <Input value={m.remarks} onChange={(e) => setMark(s._id, { remarks: e.target.value })}
                      placeholder="Reason (optional)" className="h-8 w-full text-xs sm:w-48" aria-label={`Reason for ${s.firstName}`} />
                  )}
                  <div className="flex gap-1" role="radiogroup" aria-label={`Attendance for ${s.firstName} ${s.lastName}`}>
                    {ATTENDANCE_STATUSES.map((st) => (
                      <Button key={st} type="button" variant="plain" role="radio" aria-checked={m?.status === st} title={st}
                        onClick={() => setMark(s._id, { status: st })}
                        className={cn('h-8 min-w-8 rounded-lg border px-2 text-xs font-semibold transition-colors', m?.status === st ? STATUS_STYLE[st].on : STATUS_STYLE[st].off)}>
                        <span className="sm:hidden">{STATUS_STYLE[st].short}</span>
                        <span className="hidden sm:inline">{st}</span>
                      </Button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {students.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <Button onClick={save} disabled={saving || !periodId} className="gap-2">
              {saving ? <SpinnerGap size={16} className="animate-spin" /> : <FloppyDisk size={16} />}
              {saving ? 'Saving…' : alreadySaved ? 'Update attendance' : 'Save attendance'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
