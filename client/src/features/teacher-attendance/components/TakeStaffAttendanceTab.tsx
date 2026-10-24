import { useEffect, useMemo, useState } from 'react';
import { Checks, FloppyDisk, MagnifyingGlass, SpinnerGap, UsersThree } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker, TimePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { attendanceService, ATTENDANCE_STATUSES, type AttendanceStatusName, type Staff } from '../../../services/attendance.service';
import { STATUS_STYLE } from '../../attendance/statusStyles';

type Mark = { status: AttendanceStatusName; remarks: string; time_in: string };

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const staffName = (s: Staff) => s.userId?.name || `${s.userId?.firstName ?? ''} ${s.userId?.lastName ?? ''}`.trim() || s.staffId;
const recordTeacherId = (r: { teacherId: Staff | string }) => (typeof r.teacherId === 'object' ? r.teacherId._id : r.teacherId);
const LABEL: Record<AttendanceStatusName, string> = { Present: 'Present', Absent: 'Absent', Late: 'Late', Excused: 'Leave' };

/** One list of every active staff member for a day: tap a status, save once. */
export default function TakeStaffAttendanceTab() {
  const { showToast } = useToast();
  const [date, setDate] = useState(todayIso());
  const [staff, setStaff] = useState<Staff[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [q, setQ] = useState('');
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Staff list and any marks already saved for the day, fetched together.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([attendanceService.getStaff(), attendanceService.getStaffAttendance({ date, limit: 500 })])
      .then(([list, saved]) => {
        if (cancelled) return;
        const active = list.filter((s) => s.status !== 'Inactive').sort((a, b) => staffName(a).localeCompare(staffName(b)));
        const savedBy = new Map(saved.map((r) => [recordTeacherId(r), r]));
        setStaff(active);
        setMarks(Object.fromEntries(active.map((s) => {
          const r = savedBy.get(s._id);
          // Staff on leave start as "Leave" rather than "Present".
          const fallback: AttendanceStatusName = s.status === 'On Leave' ? 'Excused' : 'Present';
          return [s._id, { status: r?.status ?? fallback, remarks: r?.remarks ?? '', time_in: r?.time_in ?? '' }];
        })));
        setAlreadySaved(saved.length > 0);
        setDirty(false);
      })
      .catch(() => { if (!cancelled) showToast('Could not load staff.', 'error'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [date, showToast]);

  const setMark = (id: string, patch: Partial<Mark>) => {
    setMarks((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
    setDirty(true);
  };

  const markAllPresent = () => {
    setMarks((m) => Object.fromEntries(staff.map((s) => [s._id, { ...m[s._id], status: 'Present' as AttendanceStatusName }])));
    setDirty(true);
  };

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? staff.filter((s) => `${staffName(s)} ${s.staffId} ${s.department ?? ''}`.toLowerCase().includes(term)) : staff;
  }, [staff, q]);

  const save = async () => {
    setSaving(true);
    try {
      await attendanceService.saveStaffAttendance({
        att_date: date,
        attendance: staff.map((s) => ({
          teacherId: s._id,
          status: marks[s._id].status,
          remarks: marks[s._id].remarks || undefined,
          time_in: marks[s._id].status === 'Late' && marks[s._id].time_in ? marks[s._id].time_in : undefined,
        })),
      });
      setAlreadySaved(true);
      setDirty(false);
      showToast(`Attendance saved for ${staff.length} staff.`);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Could not save attendance.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const counts = ATTENDANCE_STATUSES.map((st) => ({ st, n: staff.filter((s) => marks[s._id]?.status === st).length }));

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/70 shadow-none">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="sa-date" className="text-xs">Date</Label>
            <DatePicker id="sa-date" value={date} max={todayIso()} onChange={(v) => v && setDate(v)} className="w-52" />
          </div>
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a staff member" className="pl-8" aria-label="Find a staff member" />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {counts.map(({ st, n }) => (
              <span key={st} className={cn('rounded-full px-2.5 py-1 font-medium', STATUS_STYLE[st].pill)}>{n} {LABEL[st].toLowerCase()}</span>
            ))}
            {alreadySaved && !dirty && <span className="text-muted-foreground">· saved</span>}
            {dirty && <span className="text-warning">· not saved yet</span>}
          </div>
          <Button variant="outline" size="xs" onClick={markAllPresent} disabled={!staff.length}>
            <Checks size={14} /> All present
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><SpinnerGap size={24} className="animate-spin text-primary" /></div>
        ) : staff.length === 0 ? (
          <EmptyState icon={UsersThree} text="No staff yet. Add teachers first." />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((s) => {
              const m = marks[s._id];
              return (
                <li key={s._id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <div className="min-w-[160px] flex-1">
                    <p className="truncate text-sm font-medium">{staffName(s)}</p>
                    <p className="text-xs text-muted-foreground">{[s.staffId, s.department].filter(Boolean).join(' · ')}</p>
                  </div>
                  {m?.status === 'Late' && (
                    <TimePicker value={m.time_in} onChange={(v) => setMark(s._id, { time_in: v })}
                      className="w-32" aria-label={`Time ${staffName(s)} arrived`} placeholder="Arrived at" />
                  )}
                  {m && m.status !== 'Present' && (
                    <Input value={m.remarks} onChange={(e) => setMark(s._id, { remarks: e.target.value })}
                      placeholder="Reason (optional)" className="h-8 w-full text-xs sm:w-44" aria-label={`Reason for ${staffName(s)}`} />
                  )}
                  <div className="flex gap-1" role="radiogroup" aria-label={`Attendance for ${staffName(s)}`}>
                    {ATTENDANCE_STATUSES.map((st) => (
                      <Button key={st} type="button" variant="plain" role="radio" aria-checked={m?.status === st} title={LABEL[st]}
                        onClick={() => setMark(s._id, { status: st })}
                        className={cn('h-8 min-w-8 rounded-lg border px-2 text-xs font-semibold transition-colors', m?.status === st ? STATUS_STYLE[st].on : STATUS_STYLE[st].off)}>
                        <span className="sm:hidden">{LABEL[st][0]}</span>
                        <span className="hidden sm:inline">{LABEL[st]}</span>
                      </Button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {staff.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <Button onClick={save} disabled={saving}>
              {saving ? <SpinnerGap size={16} className="animate-spin" /> : <FloppyDisk size={16} />}
              {saving ? 'Saving…' : alreadySaved ? 'Update attendance' : 'Save attendance'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
