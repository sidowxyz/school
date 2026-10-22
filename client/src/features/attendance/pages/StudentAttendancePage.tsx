import React, { useState, useRef, useEffect } from 'react';
import { DownloadSimple, TrendUp, ChartBar, CheckCircle, XCircle, Clock, WarningCircle, Calendar, CaretDown, Check, FloppyDisk, SpinnerGap, SquaresFour, CheckSquare, FileText, ChecksFat, GraduationCap, Stack, UserCheck, ShieldCheck } from '@phosphor-icons/react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  attendanceService,
  sectionClassId,
  ClassData,
  SectionData,
  Term,
  Period,
  Student,
  StudentAttendanceRecord,
  AttendanceStatusName,
  ATTENDANCE_STATUSES,
} from '../../../services/attendance.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

// Modern shadcn-styled custom Dropdown
interface DropdownProps {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
}

function Dropdown({ value, options, onChange, icon, placeholder = 'Select...' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="plain"
        onClick={() => setOpen((o) => !o)}
        className="flex h-auto items-center gap-2 border border-border/80 rounded-lg px-3 py-2 bg-background hover:bg-muted/50 text-sm font-normal text-foreground min-w-[165px] justify-between transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="flex items-center gap-2 truncate">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          <span className={selectedOption ? 'font-medium truncate' : 'text-muted-foreground truncate'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <CaretDown size={14} className={`text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg z-50 min-w-full max-h-60 overflow-y-auto p-1 animate-in fade-in-0 zoom-in-95">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground italic">No options available</div>
          ) : (
            options.map((opt) => (
              <Button
                type="button"
                variant="plain"
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`h-auto w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  opt.value === value
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {opt.value === value && <Check size={13} className="shrink-0 ml-2" />}
              </Button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Toast
function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 ${
        type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-950/20' : 'bg-rose-600 text-white shadow-rose-950/20'
      } px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 z-50 text-sm font-medium animate-in slide-in-from-bottom-3 duration-200`}
    >
      {type === 'success' ? <CheckCircle size={18} className="shrink-0" /> : <WarningCircle size={18} className="shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

// Status Badge
function StatusBadge({ statusName }: { statusName: string }) {
  const norm = statusName.toLowerCase();
  if (norm === 'present') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Present
      </span>
    );
  }
  if (norm === 'absent') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Absent
      </span>
    );
  }
  if (norm === 'late') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Late
      </span>
    );
  }
  if (norm === 'excused') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        Excused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      {statusName || 'Pending'}
    </span>
  );
}

function studentName(s: Student) {
  return `${s.firstName} ${s.lastName}`;
}

// Mark Attendance Tab
interface MarkAttendanceTabProps {
  terms: Term[];
  classes: ClassData[];
  sections: SectionData[];
  statuses: AttendanceStatusName[];
  selectedTermId: string;
  setSelectedTermId: (id: string) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedSectionId: string;
  setSelectedSectionId: (id: string) => void;
}

function MarkAttendanceTab({
  terms, classes, sections, statuses,
  selectedTermId, setSelectedTermId,
  selectedClassId, setSelectedClassId,
  selectedSectionId, setSelectedSectionId,
}: MarkAttendanceTabProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [markedRecords, setMarkedRecords] = useState<Record<string, { status: AttendanceStatusName; remarks: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const sectionsForClass = sections.Funnel((s) => sectionClassId(s) === selectedClassId);

  // Periods are term-scoped
  useEffect(() => {
    if (!selectedTermId) { setPeriods([]); setSelectedPeriodId(''); return; }
    let cancelled = false;
    attendanceService.getPeriods(selectedTermId)
      .then((list) => {
        if (cancelled) return;
        setPeriods(list);
        setSelectedPeriodId(list[0]?._id || '');
      })
      .catch(() => { if (!cancelled) setPeriods([]); });
    return () => { cancelled = true; };
  }, [selectedTermId]);

  // Fetch roster and existing records
  useEffect(() => {
    if (!selectedClassId || !selectedSectionId) return;

    async function loadStudentsAndAttendance() {
      try {
        setLoading(true);
        const studentsList = await attendanceService.getEnrolledStudents(selectedClassId, selectedSectionId);
        setEnrolledStudents(studentsList);

        const attendanceList = selectedPeriodId
          ? await attendanceService.getStudentAttendance({
              classId: selectedClassId,
              sectionId: selectedSectionId,
              date,
              periodId: selectedPeriodId,
            })
          : [];

        const initialMarked: Record<string, { status: AttendanceStatusName; remarks: string }> = {};
        studentsList.forEach(s => {
          const rec = attendanceList.find(r => {
            const sid = typeof r.studentId === 'object' ? r.studentId._id : r.studentId;
            return sid === s._id;
          });
          initialMarked[s._id] = {
            status: rec ? rec.status : 'Present',
            remarks: rec?.remarks || ''
          };
        });

        setMarkedRecords(initialMarked);
      } catch (err) {
        console.error('Error fetching enrolled students/attendance:', err);
        setToast({ msg: 'Failed to load class roster', type: 'error' });
      } finally {
        setLoading(false);
      }
    }

    loadStudentsAndAttendance();
  }, [selectedClassId, selectedSectionId, date, selectedPeriodId]);

  function handleMarkStatus(studentId: string, status: AttendanceStatusName) {
    setMarkedRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  }

  function handleMarkAll(status: AttendanceStatusName) {
    setMarkedRecords(prev => {
      const next: Record<string, { status: AttendanceStatusName; remarks: string }> = {};
      enrolledStudents.forEach(s => {
        next[s._id] = {
          status,
          remarks: prev[s._id]?.remarks || '',
        };
      });
      return next;
    });
    setToast({ msg: `Marked all students as ${status}`, type: 'success' });
  }

  function handleRemarkChange(studentId: string, val: string) {
    setMarkedRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks: val }
    }));
  }

  async function handleSave() {
    if (!selectedPeriodId || !date) {
      setToast({ msg: 'Please select a term, period, and date', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      const recordsToSave = enrolledStudents.map(s => ({
        studentId: s._id,
        status: markedRecords[s._id]?.status,
        remarks: markedRecords[s._id]?.remarks
      })).Funnel((r): r is { studentId: string; status: AttendanceStatusName; remarks: string } => !!r.status);

      if (recordsToSave.length === 0) {
        setToast({ msg: 'No students found to mark', type: 'error' });
        return;
      }

      await attendanceService.saveStudentAttendance({
        periodId: selectedPeriodId,
        att_date: date,
        attendance: recordsToSave
      });

      setToast({ msg: 'Attendance saved successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      setToast({ msg: err.response?.data?.message || 'Failed to FloppyDisk attendance', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const presentCount = Object.values(markedRecords).Funnel(r => r.status === 'Present').length;
  const absentCount = Object.values(markedRecords).Funnel(r => r.status === 'Absent').length;
  const lateCount = Object.values(markedRecords).Funnel(r => r.status === 'Late').length;

  const presentRate = enrolledStudents.length > 0
    ? ((presentCount / enrolledStudents.length) * 100).toFixed(1)
    : '0.0';

  const selectedClass = classes.find(c => c._id === selectedClassId);
  const selectedSection = sectionsForClass.find(s => s._id === selectedSectionId);
  const selectedPeriod = periods.find(p => p._id === selectedPeriodId);

  return (
    <div className="space-y-5">
      {/* Filters Card */}
      <Card className="p-4 border-border/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 border border-border/80 rounded-lg px-3 py-2 bg-background shadow-2xs">
            <Calendar size={15} className="text-muted-foreground shrink-0" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-auto w-auto border-0 bg-transparent p-0 text-sm text-foreground cursor-pointer focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <Dropdown
            value={selectedTermId}
            options={terms.map(t => ({ label: t.name, value: t._id }))}
            onChange={setSelectedTermId}
            icon={<Stack size={14} />}
            placeholder="Select Term"
          />

          <Dropdown
            value={selectedClassId}
            options={classes.map(c => ({ label: c.cl_name, value: c._id }))}
            onChange={(v) => { setSelectedClassId(v); setSelectedSectionId(''); }}
            icon={<GraduationCap size={14} />}
            placeholder="Select Class"
          />

          <Dropdown
            value={selectedSectionId}
            options={sectionsForClass.map(s => ({ label: s.name, value: s._id }))}
            onChange={setSelectedSectionId}
            placeholder="Select Section"
          />

          <Dropdown
            value={selectedPeriodId}
            options={periods.map(p => ({ label: `${p.per_name} (${p.time_in})`, value: p._id }))}
            onChange={setSelectedPeriodId}
            icon={<Clock size={14} />}
            placeholder="Select Period"
          />

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleMarkAll('Present')}
              disabled={enrolledStudents.length === 0 || loading}
              className="h-9 gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60"
            >
              <ChecksFat size={14} />
              Mark All Present
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loading || enrolledStudents.length === 0}
              className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
            >
              {saving ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Roster summary: one panel, five cells separated by hairlines */}
      <Card className="overflow-hidden border-border bg-border shadow-sm">
        <div className="grid grid-cols-2 gap-px lg:grid-cols-5">
          <div className="bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Enrolled</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100/80 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"><UserCheck className="h-4 w-4" /></span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{enrolledStudents.length}</p>
          </div>
          <div className="bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Present</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><CheckCircle className="h-4 w-4" /></span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">{presentCount}</p>
          </div>
          <div className="bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Absent</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100/80 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400"><XCircle className="h-4 w-4" /></span>
            </div>
            <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${absentCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{absentCount}</p>
          </div>
          <div className="bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Late</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100/80 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"><Clock className="h-4 w-4" /></span>
            </div>
            <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${lateCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>{lateCount}</p>
          </div>
          <div className="col-span-2 bg-card p-4 lg:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Presence rate</p>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100/80 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400"><TrendUp className="h-4 w-4" /></span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {presentRate}<span className="ml-0.5 text-lg font-medium text-muted-foreground">%</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, Number(presentRate) || 0))}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Student Attendance Roster Table */}
      <Card className="overflow-hidden border-border/80 shadow-xs">
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {selectedClass?.cl_name || 'Class'} {selectedSection?.name ? `· ${/^section/i.test(selectedSection.name) ? selectedSection.name : `Section ${selectedSection.name}`}` : ''}
            </span>
            <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
              {selectedPeriod?.per_name || 'Period'} ({selectedPeriod?.time_in || 'Time'})
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <SpinnerGap size={32} className="animate-spin text-primary" />
            <span className="text-xs font-medium">Loading class roster...</span>
          </div>
        ) : enrolledStudents.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No students found enrolled in this class/section.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/30">
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px]">
                    Adm No.
                  </TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Student
                  </TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                    Status
                  </TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Mark Attendance
                  </TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[200px]">
                    Remarks
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolledStudents.map((s) => {
                  const currentStatus = markedRecords[s._id]?.status;
                  const currentRemarks = markedRecords[s._id]?.remarks || '';
                  const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase() || 'ST';

                  return (
                    <TableRow key={s._id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                      <TableCell className="px-5 py-3 text-xs font-mono text-muted-foreground font-medium">
                        {s.admissionNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0 ring-1 ring-border">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground tracking-tight">{studentName(s)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <StatusBadge statusName={currentStatus || 'Pending'} />
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {statuses.map((st) => {
                            const active = currentStatus === st;
                            let activeClass = 'bg-primary text-primary-foreground border-primary shadow-xs';
                            let inactiveClass = 'text-muted-foreground border-border/80 hover:bg-muted';

                            if (st === 'Present') {
                              activeClass = 'bg-emerald-600 text-white border-emerald-600 shadow-xs dark:bg-emerald-600 dark:border-emerald-600';
                              inactiveClass = 'text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40';
                            } else if (st === 'Absent') {
                              activeClass = 'bg-rose-600 text-white border-rose-600 shadow-xs dark:bg-rose-600 dark:border-rose-600';
                              inactiveClass = 'text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/40';
                            } else if (st === 'Late') {
                              activeClass = 'bg-amber-600 text-white border-amber-600 shadow-xs dark:bg-amber-600 dark:border-amber-600';
                              inactiveClass = 'text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-950/40';
                            } else if (st === 'Excused') {
                              activeClass = 'bg-sky-600 text-white border-sky-600 shadow-xs dark:bg-sky-600 dark:border-sky-600';
                              inactiveClass = 'text-sky-700 dark:text-sky-400 border-sky-500/30 hover:bg-sky-50 dark:hover:bg-sky-950/40';
                            }

                            return (
                              <Button
                                type="button"
                                variant="plain"
                                key={st}
                                onClick={() => handleMarkStatus(s._id, st)}
                                className={`h-auto px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                                  active ? activeClass : inactiveClass
                                }`}
                              >
                                {st}
                              </Button>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <Input
                          type="text"
                          placeholder="Optional remarks..."
                          value={currentRemarks}
                          onChange={(e) => handleRemarkChange(s._id, e.target.value)}
                          className="h-8 text-xs bg-background/80 border-border/80 focus:border-primary w-full"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

// Dashboard Tab
function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ChartBar size={18} />
      </span>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function DashboardTab() {
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await attendanceService.getStudentAttendance({ limit: 3000 });
        setRecords(data);
      } catch (err) {
        console.error('Error fetching dashboard records:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const totalCount = records.length;
  const presentCount = records.Funnel(r => r.status === 'Present').length;
  const absentCount = records.Funnel(r => r.status === 'Absent').length;
  const lateCount = records.Funnel(r => r.status === 'Late').length;

  const rate = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : '0.0';

  const datesMap: Record<string, { present: number; absent: number }> = {};
  records.forEach(r => {
    if (!r.att_date) return;
    const dStr = new Date(r.att_date).toLocaleDateString('en-US', { weekday: 'short' });

    if (!datesMap[dStr]) datesMap[dStr] = { present: 0, absent: 0 };
    if (r.status === 'Present') datesMap[dStr].present++;
    else if (r.status === 'Absent') datesMap[dStr].absent++;
  });

  const weeklyData = Object.entries(datesMap).map(([day, stats]) => ({
    day, Present: stats.present, Absent: stats.absent,
  })).slice(-5);

  const monthMap: Record<string, { total: number; present: number }> = {};
  records.forEach(r => {
    if (!r.att_date) return;
    const mStr = new Date(r.att_date).toLocaleDateString('en-US', { month: 'short' });
    if (!monthMap[mStr]) monthMap[mStr] = { total: 0, present: 0 };
    monthMap[mStr].total++;
    if (r.status === 'Present') monthMap[mStr].present++;
  });

  const trendData = Object.entries(monthMap).map(([month, stats]) => ({
    month, rate: parseFloat(((stats.present / stats.total) * 100).toFixed(1))
  })).slice(-6);

  const gradeMap: Record<string, { total: number; present: number }> = {};
  records.forEach(r => {
    let clName = '';
    if (r.studentId && typeof r.studentId === 'object' && r.studentId.classId && typeof r.studentId.classId === 'object') {
      clName = r.studentId.classId.cl_name;
    }
    if (!clName) return;

    if (!gradeMap[clName]) gradeMap[clName] = { total: 0, present: 0 };
    gradeMap[clName].total++;
    if (r.status === 'Present') gradeMap[clName].present++;
  });

  const gradeData = Object.entries(gradeMap).map(([grade, stats]) => ({
    grade, rate: parseFloat(((stats.present / stats.total) * 100).toFixed(1))
  }));

  const gradeColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="py-24 flex items-center justify-center text-muted-foreground gap-2">
          <SpinnerGap size={36} className="animate-spin text-primary" />
          <span className="text-sm font-medium">Loading attendance metrics...</span>
        </div>
      ) : (
        <>
          {/* KPI strip: one panel, four cells separated by hairlines */}
          <Card className="overflow-hidden border-border bg-border shadow-sm">
            <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
              <div className="bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Presence rate</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><CheckCircle className="h-4 w-4" /></span>
                </div>
                <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                  {rate}<span className="ml-0.5 text-xl font-medium text-muted-foreground">%</span>
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, Number(rate) || 0))}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Average across all recorded days</p>
              </div>

              <div className="bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Records</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100/80 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"><ChartBar className="h-4 w-4" /></span>
                </div>
                <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-foreground">{totalCount}</p>
                <p className="mt-5 text-xs text-muted-foreground">Marks recorded across all enrolled classes</p>
              </div>

              <div className="bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Absences</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100/80 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400"><XCircle className="h-4 w-4" /></span>
                </div>
                <p className={`mt-3 text-4xl font-semibold tabular-nums tracking-tight ${absentCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{absentCount}</p>
                <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${absentCount > 0 ? 'bg-destructive' : 'bg-primary'}`} />
                  {absentCount > 0 ? 'Sessions missed, review needed' : 'No sessions missed'}
                </p>
              </div>

              <div className="bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Late arrivals</p>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100/80 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"><Clock className="h-4 w-4" /></span>
                </div>
                <p className={`mt-3 text-4xl font-semibold tabular-nums tracking-tight ${lateCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>{lateCount}</p>
                <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${lateCount > 0 ? 'bg-amber-500' : 'bg-primary'}`} />
                  {lateCount > 0 ? 'Tardy records need follow-up' : 'Everyone on time'}
                </p>
              </div>
            </div>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Weekly Overview */}
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Weekly Attendance Overview</CardTitle>
                  <CardDescription className="text-xs">Student presence vs absence distribution</CardDescription>
                </div>
                <Badge variant="outline" className="font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                  {rate}% Present Rate
                </Badge>
              </CardHeader>
              <CardContent className="pt-2">
                {weeklyData.length < 2 ? (
                  <ChartEmpty message="Attendance from at least two different days is needed to show the weekly pattern." />
                ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="presentAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.7)" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: '8px' }} />
                    <Area type="monotone" dataKey="Present" name="Present" stroke="#10b981" strokeWidth={2} fill="url(#presentAreaGrad)" />
                    <Area type="monotone" dataKey="Absent" name="Absent" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend */}
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Attendance Trend</CardTitle>
                  <CardDescription className="text-xs">Monthly presence percentage trajectory</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {trendData.length < 2 ? (
                  <ChartEmpty message="Records from at least two different months are needed to show a trend." />
                ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.7)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      formatter={(v) => [`${v}%`, 'Attendance Rate']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="rate" name="Attendance %" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Grade Comparison Bar Chart */}
          {gradeData.length > 0 && (
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">Grade-wise Attendance Comparison</CardTitle>
                  <CardDescription className="text-xs">Attendance rate compared across different secondary grades</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={gradeData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.7)" />
                    <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      formatter={(v) => [`${v}%`, 'Attendance %']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: '8px' }} />
                    <Bar dataKey="rate" name="Attendance %" radius={[6, 6, 0, 0]}>
                      {gradeData.map((_, i) => <Cell key={i} fill={gradeColors[i % gradeColors.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// Reports Tab
interface ReportsTabProps {
  classes: ClassData[];
  sections: SectionData[];
}

interface MonthlyReportItem {
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    class?: { cl_name: string };
    section?: { name: string };
  };
  stats: {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    presentRate: number;
  };
}

function ReportsTab({ classes, sections }: ReportsTabProps) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>((today.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(today.getFullYear().toString());
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [reportList, setReportList] = useState<MonthlyReportItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    try {
      setLoading(true);
      const data = await attendanceService.getStudentMonthlyReport({
        year: selectedYear,
        month: selectedMonth,
        classId: selectedClass === 'all' ? undefined : selectedClass,
        sectionId: selectedSection === 'all' ? undefined : selectedSection,
      });
      setReportList(data.studentReports || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Error fetching monthly report:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, selectedClass, selectedSection]);

  const sectionsForClass = selectedClass === 'all' ? [] : sections.Funnel((s) => sectionClassId(s) === selectedClass);

  const months = [
    { label: 'January', value: '1' }, { label: 'February', value: '2' }, { label: 'March', value: '3' },
    { label: 'April', value: '4' }, { label: 'May', value: '5' }, { label: 'June', value: '6' },
    { label: 'July', value: '7' }, { label: 'August', value: '8' }, { label: 'September', value: '9' },
    { label: 'October', value: '10' }, { label: 'November', value: '11' }, { label: 'December', value: '12' },
  ];

  const yearsOptions = [
    { label: '2025', value: '2025' }, { label: '2026', value: '2026' }, { label: '2027', value: '2027' },
  ];

  return (
    <div className="space-y-5">
      {/* Filters Card */}
      <Card className="p-4 border-border/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <Dropdown
            value={selectedMonth}
            options={months}
            onChange={setSelectedMonth}
            icon={<Calendar size={14} />}
            placeholder="Month"
          />
          <Dropdown
            value={selectedYear}
            options={yearsOptions}
            onChange={setSelectedYear}
            placeholder="Year"
          />
          <Dropdown
            value={selectedClass}
            options={[{ label: 'All Classes', value: 'all' }, ...classes.map(c => ({ label: c.cl_name, value: c._id }))]}
            onChange={(v) => { setSelectedClass(v); setSelectedSection('all'); }}
            icon={<GraduationCap size={14} />}
            placeholder="Class"
          />
          {selectedClass !== 'all' && (
            <Dropdown
              value={selectedSection}
              options={[{ label: 'All Sections', value: 'all' }, ...sectionsForClass.map(s => ({ label: s.name, value: s._id }))]}
              onChange={setSelectedSection}
              placeholder="Section"
            />
          )}

          <div className="ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <DownloadSimple size={14} />
              Export / Print
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary: one panel, three cells separated by hairlines */}
      {summary && (
        <Card className="overflow-hidden border-border bg-border shadow-sm">
          <div className="grid grid-cols-1 gap-px sm:grid-cols-3">
            <div className="bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Average attendance</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100/80 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"><TrendUp className="h-4 w-4" /></span>
              </div>
              <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {summary.totalWorkingDaysRecorded > 0 ? (
                  <>{summary.overallPresentRate}<span className="ml-0.5 text-xl font-medium text-muted-foreground">%</span></>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {summary.totalWorkingDaysRecorded > 0 ? 'Across the selected cohort' : 'No attendance recorded for this period'}
              </p>
            </div>

            <div className="bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Enrolled students</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100/80 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400"><ChartBar className="h-4 w-4" /></span>
              </div>
              <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-foreground">{summary.totalStudents}</p>
              <p className="mt-3 text-xs text-muted-foreground">Total cohort headcount</p>
            </div>

            <div className="bg-card p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Working days</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100/80 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"><ShieldCheck className="h-4 w-4" /></span>
              </div>
              <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-foreground">{summary.totalWorkingDaysRecorded}</p>
              <p className="mt-3 text-xs text-muted-foreground">Academic sessions held</p>
            </div>
          </div>
        </Card>
      )}

      {/* Monthly Report Table */}
      <Card className="overflow-hidden border-border/80 shadow-xs">
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Monthly Student Attendance Breakdown</span>
          <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
            {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </Badge>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <SpinnerGap size={32} className="animate-spin text-primary" />
            <span className="text-xs font-medium">Generating monthly report...</span>
          </div>
        ) : reportList.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No attendance records found for this selected period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[620px]">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/30">
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Student
                  </TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Class & Section
                  </TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Present
                  </TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Absent
                  </TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Late
                  </TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Excused
                  </TableHead>
                  <TableHead className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Presence Rate
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportList.map((row) => {
                  const name = row.student ? `${row.student.firstName} ${row.student.lastName}` : 'Unknown';
                  const rollNo = row.student ? row.student.admissionNumber : 'N/A';
                  const clName = row.student?.class?.cl_name || 'N/A';
                  const secName = row.student?.section?.name;
                  const initials = `${row.student?.firstName?.[0] || ''}${row.student?.lastName?.[0] || ''}`.toUpperCase() || 'ST';
                  const hasRecords = row.stats.present + row.stats.absent + row.stats.late + row.stats.excused > 0;
                  const countCls = (n: number, tone: string) => (n > 0 ? tone : 'text-muted-foreground/60');

                  return (
                    <TableRow key={row.student?._id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                      <TableCell className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground tracking-tight">{name}</p>
                            <p className="text-[11px] font-mono text-muted-foreground">{rollNo}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-xs text-muted-foreground font-medium">
                        {clName}{secName ? ` · ${secName}` : ''}
                      </TableCell>
                      <TableCell className={`px-5 py-3 text-sm font-semibold tabular-nums ${countCls(row.stats.present, 'text-emerald-600 dark:text-emerald-400')}`}>
                        {row.stats.present}
                      </TableCell>
                      <TableCell className={`px-5 py-3 text-sm font-semibold tabular-nums ${countCls(row.stats.absent, 'text-rose-600 dark:text-rose-400')}`}>
                        {row.stats.absent}
                      </TableCell>
                      <TableCell className={`px-5 py-3 text-sm font-semibold tabular-nums ${countCls(row.stats.late, 'text-amber-600 dark:text-amber-400')}`}>
                        {row.stats.late}
                      </TableCell>
                      <TableCell className={`px-5 py-3 text-sm font-semibold tabular-nums ${countCls(row.stats.excused, 'text-sky-600 dark:text-sky-400')}`}>
                        {row.stats.excused}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        {hasRecords ? (
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold ${
                              row.stats.presentRate >= 80
                                ? 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/20'
                                : row.stats.presentRate >= 60
                                ? 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20'
                                : 'text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/20'
                            }`}
                          >
                            {row.stats.presentRate}%
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground/60">No data</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

// Main Page
type Tab = 'Dashboard' | 'Mark Attendance' | 'Reports';

export default function StudentAttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  useEffect(() => {
    async function loadRefs() {
      try {
        setLoading(true);
        const [termList, classList, sectionList] = await Promise.all([
          attendanceService.getTerms(),
          attendanceService.getClasses(),
          attendanceService.getSections(),
        ]);
        setTerms(termList);
        setClasses(classList);
        setSections(sectionList);

        const activeTerm = termList.find((t) => t.status === 'active') ?? termList[0];
        if (activeTerm) setSelectedTermId(activeTerm._id);
        if (classList.length > 0) {
          setSelectedClassId(classList[0]._id);
          const firstSection = sectionList.find((s) => sectionClassId(s) === classList[0]._id);
          if (firstSection) setSelectedSectionId(firstSection._id);
        }
      } catch (err) {
        console.error('Error loading academic references:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRefs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-3">
        <SpinnerGap size={36} className="animate-spin text-primary" />
        <span className="text-sm font-medium">Loading attendance system...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simplified Clean Page Header matching Admin Dashboard */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Student Attendance</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('Reports')}
            className="gap-1.5 text-xs font-semibold h-9"
          >
            <FileText className="h-3.5 w-3.5" />
            View Reports
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setActiveTab('Mark Attendance')}
            className="gap-1.5 text-xs font-semibold h-9 shadow-xs"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Radix / Shadcn Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="space-y-6">
        <TabsList className="grid w-full sm:w-auto grid-cols-3 h-auto gap-1 bg-card p-1.5 border border-border shadow-sm rounded-xl">
          <TabsTrigger value="Dashboard" className="rounded-lg text-xs sm:text-sm font-semibold py-2.5 gap-2 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary">
            <SquaresFour className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="Mark Attendance" className="rounded-lg text-xs sm:text-sm font-semibold py-2.5 gap-2 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary">
            <CheckSquare className="h-4 w-4" />
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger value="Reports" className="rounded-lg text-xs sm:text-sm font-semibold py-2.5 gap-2 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary">
            <FileText className="h-4 w-4" />
            Monthly Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="Dashboard" className="mt-0 focus-visible:outline-none">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="Mark Attendance" className="mt-0 focus-visible:outline-none">
          <MarkAttendanceTab
            terms={terms}
            classes={classes}
            sections={sections}
            statuses={ATTENDANCE_STATUSES}
            selectedTermId={selectedTermId}
            setSelectedTermId={setSelectedTermId}
            selectedClassId={selectedClassId}
            setSelectedClassId={setSelectedClassId}
            selectedSectionId={selectedSectionId}
            setSelectedSectionId={setSelectedSectionId}
          />
        </TabsContent>

        <TabsContent value="Reports" className="mt-0 focus-visible:outline-none">
          <ReportsTab classes={classes} sections={sections} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
