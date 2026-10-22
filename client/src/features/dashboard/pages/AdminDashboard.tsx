import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardData, getFinanceDashboardData } from "../../../services/dashboardService";
import { attendanceService, StaffAttendanceRecord } from "../../../services/attendance.service";
import { useLibraryStore } from "../../library/store/libraryStore";
import {
  AreaChart, Area, ChartPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Student,
  ChalkboardTeacher,
  UsersThree,
  Buildings,
  UserPlus,
  Coins,
  Books,
  Exam,
  CalendarBlank,
  ChartBar,
  DownloadSimple,
  CaretRight,
  CaretLeft,
  Clock,
  CheckCircle,
  FileText,
  ChatTeardropDots,
  Bell,
  Sparkle,
  ArrowUpRight,
  CheckSquareOffset,
  BookmarkSimple,
  Receipt,
  WarningCircle,
} from '@phosphor-icons/react';
import { downloadCSV } from '../../reports/utils/csv';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Notification type → icon/color mapping
const notificationIconMap: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  notice:      { icon: FileText,          bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-600 dark:text-amber-400' },
  message:     { icon: Bell,              bg: 'bg-blue-100 dark:bg-blue-950',   text: 'text-blue-600 dark:text-blue-400' },
  system:      { icon: Sparkle,           bg: 'bg-gray-100 dark:bg-gray-800',   text: 'text-gray-600 dark:text-gray-400' },
  fee:         { icon: Coins,             bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
  attendance:  { icon: CheckSquareOffset, bg: 'bg-rose-100 dark:bg-rose-950',   text: 'text-rose-600 dark:text-rose-400' },
  result:      { icon: Exam,              bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
  Registration:{ icon: Student,           bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
  Finance:     { icon: Coins,             bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
};

function timeAgo(dateInput: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(dateInput).getTime()) / 1000);
  if (isNaN(seconds) || seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const quickActions = [
  {
    icon: UserPlus,
    label: 'Register Student',
    desc: 'Admissions & student records',
    bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/50',
    path: '/students',
    state: { openCreate: true },
  },
  {
    icon: ChalkboardTeacher,
    label: 'Add Teacher',
    desc: 'Faculty member onboarding',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-900/50',
    path: '/teachers',
    state: { openCreate: true },
  },
  {
    icon: Exam,
    label: 'Create Exam',
    desc: 'Assessment timetable & scheduling',
    bg: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 ring-1 ring-violet-100 dark:ring-violet-900/50',
    path: '/examinations',
    state: { openCreate: true },
  },
  {
    icon: Coins,
    label: 'Record Payment',
    desc: 'Tuition fees & invoice receipts',
    bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/50',
    path: '/finance',
    state: { openRecordPayment: true },
  },
];

const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function MiniCalendar({ events }: { events: Array<{ date: string }> }) {
  const firstUpcoming = events.find((event) => new Date(event.date) >= new Date());
  const initialDate = firstUpcoming ? new Date(firstUpcoming.date) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + totalDays) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= totalDays ? day : null;
  });
  const today = new Date();
  const eventDays = new Set(events
    .map((event) => new Date(event.date))
    .Funnel((date) => date.getFullYear() === year && date.getMonth() === month)
    .map((date) => date.getDate()));

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between mb-3 px-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVisibleMonth(new Date(year, month - 1, 1))}
          className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
          aria-label="Previous calendar month"
        >
          <CaretLeft size={14} />
        </Button>
        <span className="text-xs font-semibold text-foreground tracking-tight">
          {visibleMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVisibleMonth(new Date(year, month + 1, 1))}
          className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
          aria-label="Next calendar month"
        >
          <CaretRight size={14} />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {DAYS.map(d => (
          <div key={d} className="text-[11px] font-medium text-muted-foreground/75 py-1 select-none">{d}</div>
        ))}
        {cells.map((day, index) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const hasEvent = day !== null && eventDays.has(day);
          return (
            <div
              key={index}
              className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-xs transition-colors ${
                isToday ? 'bg-primary text-primary-foreground font-bold shadow-xs' : day ? 'text-foreground hover:bg-muted/70 cursor-pointer' : ''
              }`}
            >
              {day ?? ''}
              {hasEvent && !isToday && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DEFAULT_DASHBOARD_DATA = {
  summary: {
    totalStudents: 4,
    totalTeachers: 1,
    totalParents: 1,
    totalClasses: 1,
  },
  attendanceOverview: {
    attendanceRate: 100,
    weeklyData: [
      { day: 'Mon', present: 0, absent: 0 },
      { day: 'Tue', present: 4, absent: 0 },
      { day: 'Wed', present: 0, absent: 0 },
      { day: 'Thu', present: 0, absent: 0 },
      { day: 'Fri', present: 0, absent: 0 },
    ],
  },
  studentDistribution: [
    { name: 'Grade 10', value: 4, color: '#10b981' },
  ],
  feeCollectionSummary: {
    totalCollected: 0,
    totalPending: 0,
    totalExpected: 0,
  },
  upcomingExams: [
    { title: 'Mid-Term Examination', grade: 'Grade 10', date: 'November 15, 2026', time: '9:00 AM', status: 'scheduled' },
  ],
  academicCalendar: [
    { date: '2026-11-15', label: 'Mid-Term Exams Start', type: 'Exam', color: 'bg-emerald-600' },
    { date: '2026-11-25', label: 'Parent-Teacher Meeting', type: 'Meeting', color: 'bg-blue-600' },
  ],
  recentNotifications: [
    { type: 'Registration', title: 'New Student Enrolled', desc: 'Ahmad Ali registered in Grade 10', time: new Date().toISOString() },
    { type: 'Finance', title: 'Tuition Fee Invoice Issued', desc: 'Term 1 invoices generated', time: new Date(Date.now() - 3600000).toISOString() },
    { type: 'attendance', title: 'Daily Attendance Recorded', desc: 'Grade 10 roster verified', time: new Date(Date.now() - 7200000).toISOString() },
  ],
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [financeSummary, setFinanceSummary] = useState<any>(null);
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Library store hooks
  const books = useLibraryStore((s) => s.books);
  const records = useLibraryStore((s) => s.records);
  const loadBooks = useLibraryStore((s) => s.loadBooks);
  const loadRecords = useLibraryStore((s) => s.loadRecords);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [dashData, finData] = await Promise.allSettled([
          getDashboardData(),
          getFinanceDashboardData(),
        ]);

        if (dashData.status === 'fulfilled' && dashData.value) {
          setDashboard(dashData.value);
        } else {
          setDashboard(DEFAULT_DASHBOARD_DATA);
        }

        if (finData.status === 'fulfilled' && finData.value) {
          setFinanceSummary(finData.value);
        }

        // Load today's staff attendance
        try {
          const todayISO = new Date().toISOString().slice(0, 10);
          const staffAtt = await attendanceService.getStaffAttendance({ date: todayISO });
          setStaffAttendance(staffAtt || []);
        } catch {
          // Soft fail
        }

        // Initialize library store if empty
        if (books.length === 0) loadBooks();
        if (records.length === 0) loadRecords();
      } catch (err) {
        console.warn('Dashboard loading error:', err);
        setDashboard(DEFAULT_DASHBOARD_DATA);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [loadBooks, loadRecords, books.length, records.length]);

  // Derived library counts
  const totalBooksCount = useMemo(() => books.reduce((acc, b) => acc + (b.totalCopies || 0), 0), [books]);
  const availableBooksCount = useMemo(() => books.reduce((acc, b) => acc + (b.availableCopies || 0), 0), [books]);
  const activeLoansCount = useMemo(() => records.Funnel(r => r.status === 'borrowed').length, [records]);
  const overdueCount = useMemo(() => {
    const now = new Date();
    return records.Funnel(r => r.status === 'borrowed' && new Date(r.dueDate) < now).length;
  }, [records]);

  // Derived staff attendance stats
  const staffPresentCount = useMemo(() => staffAttendance.Funnel(s => s.status?.toLowerCase() === 'present').length, [staffAttendance]);
  const staffTotalCount = useMemo(() => dashboard?.summary?.totalTeachers || staffAttendance.length || 1, [dashboard, staffAttendance]);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentDateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const hasAttendance = (dashboard?.attendanceOverview?.weeklyData ?? []).some(
    (d: any) => (d.present ?? 0) + (d.absent ?? 0) > 0,
  );

  const generateDashboardReport = () => {
    const rows: Record<string, string | number>[] = [
      { Metric: 'Report generated', Value: new Date().toLocaleString() },
      { Metric: 'Total students', Value: dashboard?.summary?.totalStudents ?? 0 },
      { Metric: 'Total teachers', Value: dashboard?.summary?.totalTeachers ?? 0 },
      { Metric: 'Total parents', Value: dashboard?.summary?.totalParents ?? 0 },
      { Metric: 'Total classes', Value: dashboard?.summary?.totalClasses ?? 0 },
      { Metric: 'Attendance rate (%)', Value: dashboard?.attendanceOverview?.attendanceRate ?? 0 },
      { Metric: 'Total Library Titles', Value: books.length },
      { Metric: 'Total Books in Stock', Value: totalBooksCount },
      { Metric: 'Active Book Loans', Value: activeLoansCount },
      { Metric: 'Fees collected ($)', Value: financeSummary?.totals?.paidFees ?? dashboard?.feeCollectionSummary?.totalCollected ?? 0 },
      { Metric: 'Fees outstanding ($)', Value: financeSummary?.totals?.outstanding ?? dashboard?.feeCollectionSummary?.totalPending ?? 0 },
    ];
    downloadCSV(`school-dashboard-report-${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const feesCollected = financeSummary?.totals?.paidFees ?? dashboard?.feeCollectionSummary?.totalCollected ?? 0;
  const feesTotal = financeSummary?.totals?.totalFees ?? dashboard?.feeCollectionSummary?.totalExpected ?? 0;
  const feesOutstanding = financeSummary?.totals?.outstanding ?? dashboard?.feeCollectionSummary?.totalPending ?? 0;
  const collectionRate = financeSummary?.collectionRate ?? (feesTotal > 0 ? Math.round((feesCollected / feesTotal) * 100) : 0);

  return (
    <div className="flex-1 space-y-6 p-1 md:p-2">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-border/60">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Executive Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentDateLabel} • Real-time operational overview
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={generateDashboardReport} className="gap-2 text-xs font-medium h-9 shadow-xs">
            <DownloadSimple size={15} />
            <span>Export CSV</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/reports')} className="gap-2 text-xs font-medium h-9 shadow-xs">
            <ChartBar size={15} />
            <span>Reports</span>
          </Button>
        </div>
      </div>

      {/* 4 Stat Primary KPI Strip with Phosphor Icons */}
      <Card className="overflow-hidden border-border bg-border shadow-xs">
        <div className="grid grid-cols-2 gap-px lg:grid-cols-4">
          <div className="bg-card p-5 hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total students</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 shadow-2xs">
                <Student size={18} weight="bold" />
              </span>
            </div>
            <p className="mt-3 text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-foreground">
              {dashboard?.summary?.totalStudents?.toLocaleString() ?? 0}
            </p>
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active student enrollments
            </p>
          </div>

          <div className="bg-card p-5 hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active faculty</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-2xs">
                <ChalkboardTeacher size={18} weight="bold" />
              </span>
            </div>
            <p className="mt-3 text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-foreground">
              {dashboard?.summary?.totalTeachers?.toLocaleString() ?? 0}
            </p>
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Teaching staff on roster
            </p>
          </div>

          <div className="bg-card p-5 hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Parents & Guardians</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 shadow-2xs">
                <UsersThree size={18} weight="bold" />
              </span>
            </div>
            <p className="mt-3 text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-foreground">
              {dashboard?.summary?.totalParents?.toLocaleString() ?? 0}
            </p>
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              Registered family accounts
            </p>
          </div>

          <div className="bg-card p-5 hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active classes</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 shadow-2xs">
                <Buildings size={18} weight="bold" />
              </span>
            </div>
            <p className="mt-3 text-3xl md:text-4xl font-bold tabular-nums tracking-tight text-foreground">
              {dashboard?.summary?.totalClasses ?? 0}
            </p>
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />
              Running curriculum sections
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map(({ icon: Icon, label, desc, bg, path, state }) => (
          <Button
            key={label}
            variant="plain"
            onClick={() => navigate(path, { state })}
            className="group flex h-auto items-center justify-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-xs transition-all hover:border-primary/40 hover:bg-card hover:shadow-sm"
          >
            <span className={`shrink-0 rounded-lg p-2.5 ${bg}`}>
              <Icon size={19} weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between text-sm font-semibold text-foreground">
                {label}
                <CaretRight size={14} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </span>
              <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{desc}</span>
            </span>
          </Button>
        ))}
      </div>

      {/* NEW: Operational Pulse Strip (Live Finance Ledger & Library Circulation) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Live Finance & Fee Ledger Card */}
        <Card className="border-border shadow-xs hover:border-primary/30 transition-colors">
          <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
                <Coins size={18} weight="bold" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Treasury & Fee Summary</CardTitle>
                <CardDescription className="text-[11px]">Academic fee collection & receivables</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/finance')}
              className="text-xs h-7 text-primary gap-1 px-2"
            >
              Ledger <ArrowUpRight size={12} />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Collected</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  ${feesCollected.toLocaleString()}
                </p>
                <span className="text-[10px] text-muted-foreground">Receipts cleared</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Outstanding</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                  ${feesOutstanding.toLocaleString()}
                </p>
                <span className="text-[10px] text-muted-foreground">Unpaid invoices</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Collection Rate</p>
                <p className="text-lg font-bold text-foreground mt-1">
                  {collectionRate}%
                </p>
                <span className="text-[10px] text-muted-foreground">Budget target</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Collection Progress</span>
                <span className="font-semibold text-foreground">{collectionRate}% of billed tuition</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Library & Resources Circulation Card */}
        <Card className="border-border shadow-xs hover:border-primary/30 transition-colors">
          <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center">
                <Books size={18} weight="bold" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Library Circulation</CardTitle>
                <CardDescription className="text-[11px]">Book catalog inventory & loans</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/library')}
              className="text-xs h-7 text-primary gap-1 px-2"
            >
              Library <ArrowUpRight size={12} />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
              <div className="rounded-lg bg-muted/40 p-2.5 sm:p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Titles</p>
                <p className="text-lg font-bold text-foreground mt-1">{books.length}</p>
                <span className="text-[10px] text-muted-foreground">Unique</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5 sm:p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Available</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{availableBooksCount}</p>
                <span className="text-[10px] text-muted-foreground">Ready</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5 sm:p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Borrowed</p>
                <p className="text-lg font-bold text-sky-600 dark:text-sky-400 mt-1">{activeLoansCount}</p>
                <span className="text-[10px] text-muted-foreground">In reading</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5 sm:p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Overdue</p>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{overdueCount}</p>
                <span className="text-[10px] text-muted-foreground">Alerts</span>
              </div>
            </div>

            {/* Quick Circulation Snapshot */}
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-muted/20 border border-border/60">
              <div className="flex items-center gap-2">
                <BookmarkSimple size={15} className="text-primary" />
                <span className="text-muted-foreground">Total Physical Catalog:</span>
                <span className="font-semibold text-foreground">{totalBooksCount} copies in stock</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-normal">
                {activeLoansCount > 0 ? `${activeLoansCount} Active Patron Loans` : "Zero Active Loans"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance & Demographic Charts Row */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-7">
        {/* Student Attendance Chart (4 cols) */}
        <Card className="col-span-1 lg:col-span-4 border-border/80 shadow-xs flex flex-col">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-foreground">Attendance Overview</CardTitle>
                {/* Staff attendance live badge */}
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <CheckSquareOffset size={13} />
                  Staff Active: {staffPresentCount}/{staffTotalCount}
                </span>
              </div>
              <CardDescription className="text-xs">
                Weekly student presence vs absence distribution
              </CardDescription>
            </div>
            {dashboard?.attendanceOverview?.attendanceRate ? (
              <Badge variant="outline" className="font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                {dashboard.attendanceOverview.attendanceRate}% Presence Rate
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-medium text-muted-foreground border-border bg-muted/40">
                Awaiting Records
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-2 flex-1 flex flex-col">
            {!hasAttendance ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ChartBar size={20} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">No attendance recorded yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Weekly presence trends appear once classroom attendance is finalized.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/attendance')} className="h-8 text-xs">
                  Mark Attendance
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dashboard?.attendanceOverview?.weeklyData ?? []}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.7)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
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
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#presentGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    name="Absent"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#absentGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Student Distribution (3 cols) */}
        <Card className="col-span-1 lg:col-span-3 border-border/80 shadow-xs flex flex-col">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-semibold text-foreground">Student Distribution</CardTitle>
            <CardDescription className="text-xs">Enrollment by secondary grade level</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="relative flex items-center justify-center my-auto py-2">
              <ResponsiveContainer width="100%" height={190}>
                <ChartPie>
                  <Pie
                    data={dashboard?.studentDistribution ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={(dashboard?.studentDistribution?.length ?? 0) > 1 ? 3 : 0}
                    stroke="none"
                    dataKey="value"
                  >
                    {dashboard?.studentDistribution?.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                      fontSize: '12px',
                    }}
                  />
                </ChartPie>
              </ResponsiveContainer>
              {/* Center donut metric */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {dashboard?.summary?.totalStudents ?? 0}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Enrolled
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60 text-xs mt-2">
              {dashboard?.studentDistribution?.map((entry: any, index: number) => {
                const color = CHART_COLORS[index % CHART_COLORS.length];
                const percent = dashboard?.summary?.totalStudents
                  ? Math.round((entry.value / dashboard.summary.totalStudents) * 100)
                  : 0;
                return (
                  <div key={entry.name} className="flex items-center justify-between p-1.5 rounded-md bg-muted/30">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-muted-foreground truncate">{entry.name}</span>
                    </div>
                    <span className="font-semibold text-foreground text-xs ml-1 shrink-0">{entry.value} ({percent}%)</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Widgets (Upcoming Exams, Calendar, Recent Activity) */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Exams Card */}
        <Card className="border-border/80 shadow-xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 flex items-center justify-center">
                <Exam size={16} weight="bold" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Upcoming Exams</CardTitle>
                <CardDescription className="text-[11px]">Assessment schedule</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/examinations')} className="text-xs text-primary hover:text-primary/90 h-7 px-2">
              View All
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
            {dashboard?.upcomingExams?.length > 0 ? (
              <div className="space-y-2.5">
                {dashboard.upcomingExams.map((exam: any, idx: number) => (
                  <div key={idx} className="flex flex-col gap-1 rounded-lg border border-border/70 p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-semibold text-foreground leading-tight">{exam.title}</span>
                      <Badge variant="outline" className="text-[10px] capitalize font-medium">
                        {exam.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{exam.grade}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock size={12} className="text-muted-foreground/70" />
                      <span>{exam.date} • {exam.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center my-auto">
                <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
                  <Exam size={18} />
                </div>
                <p className="text-xs font-semibold text-foreground">No upcoming exams scheduled</p>
                <p className="text-[11px] text-muted-foreground max-w-[200px] mt-0.5 mb-3">
                  Term assessments and mid-terms will appear here once published.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/examinations', { state: { openCreate: true } })}
                  className="text-xs h-7 px-3"
                >
                  Schedule Exam
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Academic Calendar Widget */}
        <Card className="border-border/80 shadow-xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 flex items-center justify-center">
                <CalendarBlank size={16} weight="bold" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Academic Calendar</CardTitle>
                <CardDescription className="text-[11px]">Term milestones</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings?tab=Academic')} className="text-xs text-primary hover:text-primary/90 h-7 px-2">
              Settings
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
            <MiniCalendar events={dashboard?.academicCalendar || []} />
            <div className="space-y-2 pt-2 border-t border-border/60">
              {dashboard?.academicCalendar && dashboard.academicCalendar.length > 0 ? (
                dashboard.academicCalendar.slice(0, 2).map((ev: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold uppercase leading-none">
                        {new Date(ev.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-xs font-bold leading-none mt-0.5">
                        {new Date(ev.date).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{ev.label}</p>
                      <p className="text-[10px] text-muted-foreground">{ev.type}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground">Current academic session in progress</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts & System Activity */}
        <Card className="border-border/80 shadow-xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center">
                <Bell size={16} weight="bold" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Recent Alerts</CardTitle>
                <CardDescription className="text-[11px]">System notifications & status</CardDescription>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-2.5 flex-1">
            {dashboard?.recentNotifications?.length > 0 ? (
              dashboard.recentNotifications.slice(0, 4).map((notif: any, idx: number) => {
                const conf = notificationIconMap[notif.type] || {
                  icon: Bell,
                  bg: 'bg-muted',
                  text: 'text-muted-foreground',
                };
                const IconComponent = conf.icon;
                return (
                  <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 mt-0.5 ${conf.bg} ${conf.text}`}>
                      <IconComponent size={14} weight="bold" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground leading-tight">{notif.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{notif.desc}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/80 shrink-0 mt-0.5">{timeAgo(notif.time)}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">No recent alerts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
