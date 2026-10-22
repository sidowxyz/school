import { useState, useEffect, useMemo } from 'react';
import { DownloadSimple, ClipboardText, SquaresFour, CalendarBlank, FileText, FloppyDisk, Users, CheckCircle, XCircle, Clock, SpinnerGap, WarningCircle, TrendUp, CaretLeft, CaretRight, ChecksFat, MagnifyingGlass, Buildings, X } from '@phosphor-icons/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import PageHeader from '../../../components/common/PageHeader';
import StatStrip from '@/components/shared/StatStrip';
import {
  attendanceService,
  Staff,
  StaffAttendanceRecord,
  AttendanceStatusName,
  ATTENDANCE_STATUSES,
} from '../../../services/attendance.service';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

// Toast Component
function Toast({
  message,
  type = 'success',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}) {
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

// Status Badge Component
function StatusBadge({ statusName }: { statusName: string }) {
  const norm = (statusName || '').toLowerCase();
  if (norm === 'present') {
    return (
      <Badge variant="success" className="text-[11px] font-medium gap-1.5 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Present
      </Badge>
    );
  }
  if (norm === 'absent') {
    return (
      <Badge variant="destructive" className="text-[11px] font-medium gap-1.5 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Absent
      </Badge>
    );
  }
  if (norm === 'late') {
    return (
      <Badge variant="warning" className="text-[11px] font-medium gap-1.5 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Late
      </Badge>
    );
  }
  if (norm === 'excused' || norm === 'leave') {
    return (
      <Badge variant="secondary" className="text-[11px] font-medium gap-1.5 py-0.5 bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        On Leave
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[11px] font-medium gap-1.5 py-0.5 text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
      {statusName || 'Pending'}
    </Badge>
  );
}

// Helper: Custom Tooltip for Charts
function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
        <p className="font-semibold text-popover-foreground mb-1">{label}</p>
        <div className="space-y-0.5">
          {payload.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground">{item.name}:</span>
              <span className="font-medium text-popover-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// -------------------------------------------------------------
// 1. DASHBOARD TAB
// -------------------------------------------------------------
interface DashboardTabProps {
  staffList: Staff[];
  onNavigateToMark: () => void;
}

function DashboardTab({ staffList, onNavigateToMark }: DashboardTabProps) {
  const today = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const yearEnd = `${new Date().getFullYear()}-12-31`;
  const [todayRecords, setTodayRecords] = useState<StaffAttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<StaffAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [checklistSearch, setChecklistSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [todayData, yearData] = await Promise.all([
          attendanceService.getStaffAttendance({ date: today }),
          attendanceService.getStaffAttendance({ startDate: yearStart, endDate: yearEnd, limit: 3000 }),
        ]);
        setTodayRecords(todayData);
        setAllRecords(yearData);
      } catch (err) {
        console.error('Error loading staff dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [today, yearStart, yearEnd]);

  // Aggregate Stats
  const totalStaff = staffList.length;
  const presentToday = todayRecords.Funnel((r) => r.status === 'Present').length;
  const absentToday = todayRecords.Funnel((r) => r.status === 'Absent').length;
  const lateToday = todayRecords.Funnel((r) => r.status === 'Late').length;
  const leaveToday = todayRecords.Funnel((r) => r.status === 'Excused').length;
  const unmarkedToday = Math.max(0, totalStaff - todayRecords.length);

  // Overall Present Rate
  const totalYearRecords = allRecords.length;
  const presentYearRecords = allRecords.Funnel((r) => r.status === 'Present').length;
  const overallRate = totalYearRecords > 0 ? ((presentYearRecords / totalYearRecords) * 100).toFixed(1) : '100.0';

  // Format Recharts data (Past 5 recorded weekdays)
  const datesMap: Record<string, { present: number; absent: number; late: number; leave: number }> = {};
  allRecords.forEach((r) => {
    if (!r.att_date) return;
    const dStr = new Date(r.att_date).toLocaleDateString('en-US', { weekday: 'short' });

    if (!datesMap[dStr]) {
      datesMap[dStr] = { present: 0, absent: 0, late: 0, leave: 0 };
    }
    if (r.status === 'Present') datesMap[dStr].present++;
    else if (r.status === 'Absent') datesMap[dStr].absent++;
    else if (r.status === 'Late') datesMap[dStr].late++;
    else datesMap[dStr].leave++;
  });

  const weeklyData = Object.entries(datesMap)
    .map(([day, stats]) => ({
      day,
      Present: stats.present,
      Absent: stats.absent,
      Late: stats.late,
      Leave: stats.leave,
    }))
    .slice(-5);

  const finalWeeklyData =
    weeklyData.length > 0
      ? weeklyData
      : [
          { day: 'Mon', Present: 0, Absent: 0, Late: 0, Leave: 0 },
          { day: 'Tue', Present: 0, Absent: 0, Late: 0, Leave: 0 },
          { day: 'Wed', Present: 0, Absent: 0, Late: 0, Leave: 0 },
          { day: 'Thu', Present: 0, Absent: 0, Late: 0, Leave: 0 },
          { day: 'Fri', Present: 0, Absent: 0, Late: 0, Leave: 0 },
        ];

  // 6-Month Attendance Trend
  const monthMap: Record<string, { total: number; present: number }> = {};
  allRecords.forEach((r) => {
    if (!r.att_date) return;
    const mStr = new Date(r.att_date).toLocaleDateString('en-US', { month: 'short' });

    if (!monthMap[mStr]) {
      monthMap[mStr] = { total: 0, present: 0 };
    }
    monthMap[mStr].total++;
    if (r.status === 'Present') monthMap[mStr].present++;
  });

  const trendData = Object.entries(monthMap)
    .map(([month, stats]) => ({
      month,
      rate: parseFloat(((stats.present / stats.total) * 100).toFixed(1)),
    }))
    .slice(-6);

  const finalTrendData =
    trendData.length > 0
      ? trendData
      : [
          { month: 'Jan', rate: 100 },
          { month: 'Feb', rate: 100 },
          { month: 'Mar', rate: 100 },
        ];

  const filteredStaffChecklist = useMemo(() => {
    return staffList.Funnel((s) => {
      const q = checklistSearch.toLowerCase().trim();
      if (!q) return true;
      const name = s.userId?.name || '';
      const dept = s.department || '';
      const id = s.staffId || '';
      return name.toLowerCase().includes(q) || dept.toLowerCase().includes(q) || id.toLowerCase().includes(q);
    });
  }, [staffList, checklistSearch]);

  return (
    <div className="space-y-6">
      {/* KPI Stats Strip */}
      <StatStrip
        items={[
          {
            label: 'Total Teachers',
            value: totalStaff,
            tone: 'sky',
            icon: Users,
            hint: 'Registered faculty',
          },
          {
            label: 'Present Today',
            value: presentToday,
            tone: 'emerald',
            icon: CheckCircle,
            hint: 'Checked in on-time',
          },
          {
            label: 'Absent Today',
            value: absentToday,
            tone: 'rose',
            icon: XCircle,
            hint: 'Unexcused absences',
          },
          {
            label: 'Late Today',
            value: lateToday,
            tone: 'amber',
            icon: Clock,
            hint: 'Arrived past schedule',
          },
          {
            label: 'On Leave/Excused',
            value: leaveToday,
            tone: 'violet',
            icon: CalendarBlank,
            hint: 'Approved leaves',
          },
          {
            label: 'Attendance Rate',
            value: `${overallRate}%`,
            tone: 'emerald',
            icon: TrendUp,
            hint: 'Annual present rate',
          },
        ]}
      />

      {loading ? (
        <Card className="p-12 text-center border-border">
          <div className="flex flex-col items-center justify-center space-y-3">
            <SpinnerGap size={32} className="animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading attendance analytics...</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Weekly Attendance Overview</CardTitle>
                <CardDescription className="text-xs">
                  Daily breakdown across recorded Buildings weekdays
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={finalWeeklyData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                        iconType="circle"
                      />
                      <Bar dataKey="Present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Leave" name="Leave/Excused" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Monthly Attendance Trend</CardTitle>
                <CardDescription className="text-xs">
                  Overall present percentage trend across academic months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={finalTrendData}>
                      <defs>
                        <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                      <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={<ChartTooltip />}
                        formatter={(v) => [`${v}%`, 'Present Rate']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />
                      <Area
                        type="monotone"
                        dataKey="rate"
                        name="Present Rate"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#rateGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Status Checklist */}
          <Card className="border-border">
            <CardHeader className="border-b border-border/60 py-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Today's Attendance Status Checklist
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Daily staff check-in verification for {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
                </CardDescription>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-48 sm:w-56">
                  <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search roster..."
                    value={checklistSearch}
                    onChange={(e) => setChecklistSearch(e.target.value)}
                    className="h-8 pl-8 pr-7 text-xs"
                  />
                  {checklistSearch && (
                    <button
                      type="button"
                      onClick={() => setChecklistSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {unmarkedToday > 0 ? (
                  <Badge variant="warning" className="text-xs font-semibold py-1 px-3">
                    {unmarkedToday} Unmarked Teachers
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-xs font-semibold py-1 px-3">
                    All Checked In
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {filteredStaffChecklist.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No faculty members found.
                  </div>
                ) : (
                  filteredStaffChecklist.map((s) => {
                    const rec = todayRecords.find((r) => {
                      const teacherId = typeof r.teacherId === 'object' ? r.teacherId._id : r.teacherId;
                      return teacherId === s._id;
                    });
                    const name = s.userId?.name || 'Unknown Staff';
                    const dept = s.department || 'General Faculty';
                    const staffId = s.staffId || 'TCH';
                    const initials = name
                      .split(' ')
                      .map((w) => w[0])
                      .Funnel(Boolean)
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'T';

                    return (
                      <div
                        key={s._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-foreground truncate">{name}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="font-mono text-[11px] text-primary font-medium">{staffId}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 truncate">
                                <Buildings size={11} className="opacity-70 shrink-0" />
                                {dept}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {rec ? (
                            <>
                              <StatusBadge statusName={rec.status || 'Marked'} />
                              {rec.time_in && (
                                <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                                  In: {rec.time_in}
                                </span>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40">
                                Pending
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={onNavigateToMark}
                                className="h-7 text-xs px-2.5"
                              >
                                Mark Now
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 2. MARK ATTENDANCE TAB
// -------------------------------------------------------------
interface MarkAttendanceTabProps {
  staffList: Staff[];
  statuses: AttendanceStatusName[];
}

function MarkAttendanceTab({ staffList, statuses }: MarkAttendanceTabProps) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [markedRecords, setMarkedRecords] = useState<
    Record<string, { status: AttendanceStatusName; time_in: string; time_out: string; remarks: string }>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Fetch current attendance list for this date
  useEffect(() => {
    async function loadAttendance() {
      try {
        setLoading(true);
        const list = await attendanceService.getStaffAttendance({ date });

        const initial: Record<
          string,
          { status: AttendanceStatusName; time_in: string; time_out: string; remarks: string }
        > = {};
        staffList.forEach((s) => {
          const rec = list.find((r) => {
            const teacherId = typeof r.teacherId === 'object' ? r.teacherId._id : r.teacherId;
            return teacherId === s._id;
          });

          initial[s._id] = {
            status: rec ? rec.status : 'Present',
            time_in: rec?.time_in || '07:30 AM',
            time_out: rec?.time_out || '02:30 PM',
            remarks: rec?.remarks || '',
          };
        });
        setMarkedRecords(initial);
      } catch (err) {
        console.error('Error fetching staff attendance:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAttendance();
  }, [date, staffList]);

  function handleMark(staffId: string, status: AttendanceStatusName) {
    setMarkedRecords((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        status,
      },
    }));
  }

  function handleChangeField(staffId: string, field: string, val: string) {
    setMarkedRecords((prev) => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: val,
      },
    }));
  }

  function handleMarkAll(status: AttendanceStatusName) {
    setMarkedRecords((prev) => {
      const next = { ...prev };
      staffList.forEach((s) => {
        next[s._id] = {
          ...(next[s._id] || { time_in: '07:30 AM', time_out: '02:30 PM', remarks: '' }),
          status,
        };
      });
      return next;
    });
  }

  async function handleSave() {
    if (!date) {
      setToast({ msg: 'Please select a date', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      const recordsToSave = staffList
        .map((s) => ({
          teacherId: s._id,
          status: markedRecords[s._id]?.status,
          time_in: markedRecords[s._id]?.time_in,
          time_out: markedRecords[s._id]?.time_out,
          remarks: markedRecords[s._id]?.remarks,
        }))
        .Funnel((r) => r.status);

      await attendanceService.saveStaffAttendance({
        att_date: date,
        attendance: recordsToSave,
      });

      setToast({ msg: 'Faculty attendance records saved successfully!', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({
        msg: err.response?.data?.message || 'Failed to FloppyDisk staff attendance.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  // Funnel staff list
  const filteredStaff = staffList.Funnel((s) => {
    const name = s.userId?.name || '';
    const dept = s.department || '';
    const staffNo = s.staffId || '';

    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) || staffNo.toLowerCase().includes(search.toLowerCase());

    const matchesDept = deptFilter === 'all' || dept === deptFilter;

    return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(staffList.map((s) => s.department).Funnel(Boolean)));

  return (
    <div className="space-y-4">
      {/* Staff Roster Table with Integrated Header Toolbar */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Left: Title & Date Picker */}
            <div className="flex items-center gap-3">
              <CardTitle className="text-sm font-semibold whitespace-nowrap">
                Faculty Attendance Sheet ({filteredStaff.length})
              </CardTitle>
              <div className="flex items-center gap-1.5 border border-border rounded-lg px-2.5 py-1 bg-background text-xs shadow-xs">
                <CalendarBlank size={14} className="text-muted-foreground shrink-0" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs border-0 bg-transparent p-0 h-auto focus-visible:ring-0 shadow-none w-[115px]"
                />
              </div>
            </div>

            {/* Right: Department, MagnifyingGlass, Mark All Present & FloppyDisk Records */}
            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 flex-1">
              <NativeSelect
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-9 text-xs w-[150px]"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </NativeSelect>

              <div className="relative min-w-[170px] max-w-xs flex-1 sm:flex-initial">
                <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search faculty..."
                  value={MagnifyingGlass}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-8 pr-7 text-xs"
                />
                {MagnifyingGlass && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAll('Present')}
                className="text-xs h-9 gap-1.5 shadow-xs whitespace-nowrap"
              >
                <ChecksFat size={14} className="text-emerald-500" />
                Mark All Present
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || loading}
                className="text-xs h-9 gap-1.5 shadow-xs whitespace-nowrap"
              >
                {saving ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                {saving ? 'Saving...' : 'Save Records'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <SpinnerGap size={32} className="animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading roster...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No teachers match the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[110px] font-semibold text-xs">Staff ID</TableHead>
                  <TableHead className="font-semibold text-xs">Faculty Member</TableHead>
                  <TableHead className="font-semibold text-xs">Department</TableHead>
                  <TableHead className="font-semibold text-xs">Check In / Out</TableHead>
                  <TableHead className="font-semibold text-xs min-w-[260px]">Attendance Status</TableHead>
                  <TableHead className="font-semibold text-xs">Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((s) => {
                  const name = s.userId?.name || 'Unknown';
                  const code = s.staffId || 'TCH';
                  const dept = s.department || 'General Faculty';
                  const role = 'Teacher';

                  const currentStatus = markedRecords[s._id]?.status || 'Present';
                  const currentRemarks = markedRecords[s._id]?.remarks || '';
                  const timeIn = markedRecords[s._id]?.time_in || '07:30 AM';
                  const timeOut = markedRecords[s._id]?.time_out || '02:30 PM';

                  const initials = name
                    .split(' ')
                    .map((w) => w[0])
                    .Funnel(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'T';

                  return (
                    <TableRow key={s._id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {code}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-medium text-xs text-foreground block">{name}</span>
                            <span className="text-[11px] text-muted-foreground block">{role}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Buildings size={12} className="opacity-70 shrink-0" />
                          <span>{dept}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="text"
                            value={timeIn}
                            title="Check-in time"
                            placeholder="In"
                            onChange={(e) => handleChangeField(s._id, 'time_in', e.target.value)}
                            className="w-20 h-7 text-xs px-2"
                          />
                          <span className="text-muted-foreground text-xs">-</span>
                          <Input
                            type="text"
                            value={timeOut}
                            title="Check-out time"
                            placeholder="Out"
                            onChange={(e) => handleChangeField(s._id, 'time_out', e.target.value)}
                            className="w-20 h-7 text-xs px-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {statuses.map((st) => {
                            const isSelected = currentStatus === st;
                            let btnClasses = 'border-border text-muted-foreground hover:bg-muted';
                            if (isSelected) {
                              if (st === 'Present') btnClasses = 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs';
                              else if (st === 'Absent') btnClasses = 'bg-rose-600 text-white border-rose-600 font-semibold shadow-xs';
                              else if (st === 'Late') btnClasses = 'bg-amber-500 text-white border-amber-500 font-semibold shadow-xs';
                              else if (st === 'Excused') btnClasses = 'bg-sky-600 text-white border-sky-600 font-semibold shadow-xs';
                            }

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleMark(s._id, st)}
                                className={`px-2.5 py-1 rounded-md border text-[11px] transition-all font-medium ${btnClasses}`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          placeholder="Optional notes..."
                          value={currentRemarks}
                          onChange={(e) => handleChangeField(s._id, 'remarks', e.target.value)}
                          className="h-7 text-xs w-full max-w-[200px]"
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

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// -------------------------------------------------------------
// 3. MONTHLY VIEW TAB
// -------------------------------------------------------------
interface MonthlyViewTabProps {
  staffList: Staff[];
}

function MonthlyViewTab({ staffList }: MonthlyViewTabProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceMap, setAttendanceMap] = useState<Record<number, StaffAttendanceRecord>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (staffList.length > 0 && !selectedStaffId) {
      setSelectedStaffId(staffList[0]._id);
    }
  }, [staffList, selectedStaffId]);

  useEffect(() => {
    if (!selectedStaffId) return;

    async function loadMonthlyCalendar() {
      try {
        setLoading(true);
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth() + 1;
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m, 0).getDate();
        const endDate = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;

        const list = await attendanceService.getStaffAttendance({
          teacherId: selectedStaffId,
          startDate,
          endDate,
        });

        // Map status by day of the month
        const mapped: Record<number, StaffAttendanceRecord> = {};
        list.forEach((rec) => {
          if (!rec.att_date) return;
          const day = new Date(rec.att_date).getUTCDate();
          mapped[day] = rec;
        });

        setAttendanceMap(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadMonthlyCalendar();
  }, [selectedStaffId, currentDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const blankDays = Array(firstDayIndex).fill(null);
  const monthDays = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);
  const calendarCells = [...blankDays, ...monthDays];

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  function changeMonth(direction: 'next' | 'prev') {
    setCurrentDate((prev) => {
      const copy = new Date(prev);
      if (direction === 'next') copy.setMonth(copy.getMonth() + 1);
      else copy.setMonth(copy.getMonth() - 1);
      return copy;
    });
  }

  // Monthly stats for this teacher
  const monthlyPresent = Object.values(attendanceMap).Funnel((r) => r.status === 'Present').length;
  const monthlyAbsent = Object.values(attendanceMap).Funnel((r) => r.status === 'Absent').length;
  const monthlyLate = Object.values(attendanceMap).Funnel((r) => r.status === 'Late').length;
  const monthlyExcused = Object.values(attendanceMap).Funnel((r) => r.status === 'Excused').length;

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      {/* Calendar Grid */}
      <Card className="xl:col-span-8 border-border">
        <CardHeader className="border-b border-border/60 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold">{monthName}</CardTitle>
            <CardDescription className="text-xs">
              Individual calendar view for selected faculty member
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <NativeSelect
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="h-9 text-xs w-[180px]"
            >
              {staffList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.userId?.name || 'Unknown'}
                </option>
              ))}
            </NativeSelect>

            <div className="flex items-center border border-border rounded-lg bg-card">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeMonth('prev')}
                className="h-8 w-8 p-0"
              >
                <CaretLeft size={15} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="h-8 text-xs px-2 font-medium"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeMonth('next')}
                className="h-8 w-8 p-0"
              >
                <CaretRight size={15} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2">
              <SpinnerGap size={32} className="animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Loading calendar...</span>
            </div>
          ) : (
            <div>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-xs font-semibold text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid cells */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarCells.map((day, idx) => {
                  if (day === null) return <div key={`blank-${idx}`} className="h-16" />;

                  const record = attendanceMap[day];
                  const status = (record?.status || '').toLowerCase();
                  let cellStyle = 'bg-card border-border/60 hover:border-border text-foreground';

                  if (status === 'present') {
                    cellStyle = 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200';
                  } else if (status === 'absent') {
                    cellStyle = 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200';
                  } else if (status === 'late') {
                    cellStyle = 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200';
                  } else if (status === 'excused') {
                    cellStyle = 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/50 text-sky-900 dark:text-sky-200';
                  }

                  return (
                    <div
                      key={day}
                      className={`h-16 rounded-lg p-2 flex flex-col justify-between border transition-all ${cellStyle}`}
                    >
                      <span className="text-xs font-semibold">{day}</span>
                      {status && (
                        <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                          {status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend & Monthly Stats */}
      <div className="xl:col-span-4 space-y-6">
        <Card className="border-border">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-semibold">Monthly Attendance Summary</CardTitle>
            <CardDescription className="text-xs">
              Aggregate days recorded for this faculty member
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Present Days</span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{monthlyPresent}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
              <span className="text-xs font-medium text-rose-800 dark:text-rose-300">Absent Days</span>
              <span className="text-base font-bold text-rose-700 dark:text-rose-400">{monthlyAbsent}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
              <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Late Days</span>
              <span className="text-base font-bold text-amber-700 dark:text-amber-400">{monthlyLate}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40">
              <span className="text-xs font-medium text-sky-800 dark:text-sky-300">On Leave / Excused</span>
              <span className="text-base font-bold text-sky-700 dark:text-sky-400">{monthlyExcused}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-semibold">Status Legend</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {[
              { label: 'Present', desc: 'Checked in on-time', badge: 'Present' },
              { label: 'Absent', desc: 'Unexcused absence', badge: 'Absent' },
              { label: 'Late', desc: 'Arrived past start hours', badge: 'Late' },
              { label: 'Excused / Leave', desc: 'Approved official leave', badge: 'Excused' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <StatusBadge statusName={item.badge} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. REPORTS TAB
// -------------------------------------------------------------
interface ReportsTabProps {
  staffList: Staff[];
}

interface StaffReportItem {
  staff: {
    _id: string;
    stf_no: string;
    name: string;
    department: string;
    role: string;
    job_title: string;
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

function ReportsTab({ staffList }: ReportsTabProps) {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>((today.getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(today.getFullYear().toString());
  const [deptFilter, setDeptFilter] = useState('all');
  const [reportList, setReportList] = useState<StaffReportItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        const data = await attendanceService.getStaffMonthlyReport({
          year: selectedYear,
          month: selectedMonth,
          department: deptFilter === 'all' ? undefined : deptFilter,
        });
        setReportList(data.staffReports || []);
        setSummary(data.summary || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [selectedMonth, selectedYear, deptFilter]);

  const months = [
    { label: 'January', value: '1' },
    { label: 'February', value: '2' },
    { label: 'March', value: '3' },
    { label: 'April', value: '4' },
    { label: 'May', value: '5' },
    { label: 'June', value: '6' },
    { label: 'July', value: '7' },
    { label: 'August', value: '8' },
    { label: 'September', value: '9' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
  ];

  const yearsOptions = [
    { label: '2025', value: '2025' },
    { label: '2026', value: '2026' },
    { label: '2027', value: '2027' },
  ];

  const departments = Array.from(new Set(staffList.map((s) => s.department).Funnel(Boolean)));

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <Card className="border-border">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <NativeSelect
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 text-xs w-[140px]"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 text-xs w-[110px]"
            >
              {yearsOptions.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 text-xs w-[160px]"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </NativeSelect>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="text-xs h-9 gap-2 shadow-xs"
          >
            <DownloadSimple size={14} />
            Print Report
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <StatStrip
          items={[
            {
              label: 'Faculty Attendance Rate',
              value: `${summary.overallPresentRate}%`,
              tone: 'emerald',
              icon: TrendUp,
              hint: 'Average month present rate',
            },
            {
              label: 'Total Active Staff',
              value: summary.totalStaff,
              tone: 'sky',
              icon: Users,
              hint: 'Faculty headcount',
            },
            {
              label: 'Total Days Logged',
              value: summary.totalWorkingDaysRecorded,
              tone: 'amber',
              icon: CalendarBlank,
              hint: 'Working days aggregated',
            },
          ]}
        />
      )}

      {/* Roster Table */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Monthly Teacher Attendance Roster
          </CardTitle>
          <Badge variant="outline" className="text-[11px] font-normal">
            Month: {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
          </Badge>
        </CardHeader>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <SpinnerGap size={32} className="animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Generating report...</span>
          </div>
        ) : reportList.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            No attendance summaries logged for this selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-xs">Faculty Member</TableHead>
                  <TableHead className="font-semibold text-xs">Department & Role</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Logged Days</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Present</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Absent</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Late</TableHead>
                  <TableHead className="font-semibold text-xs text-center">Excused</TableHead>
                  <TableHead className="font-semibold text-xs text-right pr-6">Present Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportList.map((row) => (
                  <TableRow key={row.staff?._id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div>
                        <span className="font-semibold text-xs text-foreground block">
                          {row.staff?.name}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground block">
                          {row.staff?.stf_no || 'TCH'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Buildings size={12} className="opacity-70 shrink-0" />
                        <span>{row.staff?.department || 'General'}</span>
                        <span>•</span>
                        <span>{row.staff?.role || 'Teacher'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-center">
                      {row.stats.totalDays}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-emerald-600 text-center">
                      {row.stats.present}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-rose-500 text-center">
                      {row.stats.absent}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-amber-500 text-center">
                      {row.stats.late}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-sky-500 text-center">
                      {row.stats.excused}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge
                        variant={row.stats.presentRate >= 85 ? 'success' : row.stats.presentRate >= 70 ? 'warning' : 'destructive'}
                        className="text-xs font-bold font-mono"
                      >
                        {row.stats.presentRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN PAGE
// -------------------------------------------------------------
type Tab = 'dashboard' | 'mark' | 'monthly' | 'reports';

export default function TeacherAttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const statuses = ATTENDANCE_STATUSES;

  useEffect(() => {
    async function loadRefs() {
      try {
        setLoading(true);
        const staffData = await attendanceService.getStaff();
        setStaffList(staffData);
      } catch (err) {
        console.error('Error loading teacher references:', err);
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
        <span className="text-xs">Loading faculty attendance system...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Attendance"
        subtitle="Track and manage teaching staff daily check-ins, record absences, and monitor attendance trends."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('reports')}
              className="gap-2 shadow-xs"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">Reports</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab('mark')}
              className="gap-2 shadow-xs"
            >
              <ClipboardText size={15} />
              Mark Attendance
            </Button>
          </div>
        }
      />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 border border-border bg-card p-1.5 shadow-sm rounded-xl">
          <TabsTrigger
            value="dashboard"
            className="flex-1 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold gap-2 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary"
          >
            <SquaresFour size={15} />
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="mark"
            className="flex-1 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold gap-2 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary"
          >
            <ClipboardText size={15} />
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            className="flex-1 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold gap-2 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary"
          >
            <CalendarBlank size={15} />
            Monthly View
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="flex-1 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold gap-2 text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary"
          >
            <FileText size={15} />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
          <DashboardTab
            staffList={staffList}
            onNavigateToMark={() => setActiveTab('mark')}
          />
        </TabsContent>

        <TabsContent value="mark" className="mt-0 focus-visible:outline-none">
          <MarkAttendanceTab staffList={staffList} statuses={statuses} />
        </TabsContent>

        <TabsContent value="monthly" className="mt-0 focus-visible:outline-none">
          <MonthlyViewTab staffList={staffList} />
        </TabsContent>

        <TabsContent value="reports" className="mt-0 focus-visible:outline-none">
          <ReportsTab staffList={staffList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}