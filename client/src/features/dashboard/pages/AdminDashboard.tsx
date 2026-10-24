import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChalkboardTeacher, Coins, DownloadSimple, CalendarCheck, PencilSimple, Plus, Student, UsersThree } from '@phosphor-icons/react';
import { getDashboardData, getFinanceDashboardData } from '../../../services/dashboardService';
import { downloadCSV } from '../../reports/utils/csv';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import {
  ActivityFeed, AttendancePanel, DashboardColumns, DashboardError, DashboardHeader, DashboardLoading, DonutBreakdown, DotPill, KpiRow, KpiTile, MiniStat, Panel, PanelLink, ProgressLine, QuickActions, WeekCalendar, type ActivityItem, type CalendarItem,
} from '../components/DashboardKit';
import { TILE_FILLS, initials, money, timeAgo } from '../components/dashboardUtils';

// Shape of GET /api/v1/analytics/admin-kpis.
interface RecentStudent {
  _id: string; name: string; admissionNumber: string; email: string | null; parentName: string | null;
  className: string | null; status: string; createdAt: string;
}
export interface SchoolKpis {
  summary: { totalStudents: number; totalTeachers: number; totalParents: number; totalClasses: number };
  newThisWeek?: { students: number; teachers: number; parents: number };
  recentStudents?: RecentStudent[];
  attendanceOverview: { attendanceRate: number; weeklyData: { day: string; present: number; absent: number }[] };
  studentDistribution: { name: string; value: number }[];
  feeCollectionSummary?: { totalCollected?: number; totalExpected?: number; totalPending?: number } | null;
  academicCalendar: CalendarItem[];
  recentActivity?: ActivityItem[];
}
interface FinanceSummary { totals?: { paidFees?: number; totalFees?: number; outstanding?: number }; collectionRate?: number }

const EMPTY_SUMMARY = { totalStudents: 0, totalTeachers: 0, totalParents: 0, totalClasses: 0 };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<SchoolKpis | null>(null);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [studentView, setStudentView] = useState<'recent' | 'classes'>('recent');

  useEffect(() => {
    Promise.allSettled([getDashboardData(), getFinanceDashboardData()]).then(([dash, fin]) => {
      if (dash.status === 'fulfilled' && dash.value) setData(dash.value);
      else setLoadError('Could not load dashboard figures from the server.');
      if (fin.status === 'fulfilled' && fin.value) setFinance(fin.value);
      setLoading(false);
    });
  }, []);

  const distribution = useMemo(() => (data?.studentDistribution ?? []).filter((d) => d.value > 0), [data]);

  if (loading) return <DashboardLoading />;

  const s = data?.summary ?? EMPTY_SUMMARY;
  const week = data?.newThisWeek;
  const feesCollected = finance?.totals?.paidFees ?? data?.feeCollectionSummary?.totalCollected ?? 0;
  const feesTotal = finance?.totals?.totalFees ?? data?.feeCollectionSummary?.totalExpected ?? 0;
  const feesOutstanding = finance?.totals?.outstanding ?? data?.feeCollectionSummary?.totalPending ?? 0;
  const collectionRate = finance?.collectionRate ?? (feesTotal > 0 ? Math.round((feesCollected / feesTotal) * 100) : 0);
  const recent = data?.recentStudents ?? [];

  const exportCsv = () => downloadCSV(`school-dashboard-${new Date().toISOString().slice(0, 10)}`, [
    { Metric: 'Report generated', Value: new Date().toLocaleString() },
    { Metric: 'Students', Value: s.totalStudents },
    { Metric: 'Teachers', Value: s.totalTeachers },
    { Metric: 'Parents', Value: s.totalParents },
    { Metric: 'Classes', Value: s.totalClasses },
    { Metric: 'Attendance rate (%)', Value: data?.attendanceOverview?.attendanceRate ?? 0 },
    { Metric: 'Fees collected ($)', Value: feesCollected },
    { Metric: 'Fees outstanding ($)', Value: feesOutstanding },
  ]);

  const weekNote = (n: number | undefined, one: string, many: string) => (n ? `+${n} new ${n === 1 ? one : many} this week` : `No new ${many} this week`);

  return (
    <div className="space-y-6">
      <DashboardHeader actions={
        <Button variant="outline" size="sm" onClick={exportCsv} className="bg-card"><DownloadSimple size={15} /> Export</Button>
      } />
      <DashboardError message={loadError} />

      <DashboardColumns
        main={<>
          <KpiRow>
            <KpiTile label="Total students" value={s.totalStudents.toLocaleString()} fill="bg-tile-pink" icon={Student} note={weekNote(week?.students, 'student', 'students')} to="/students" />
            <KpiTile label="Teachers" value={s.totalTeachers.toLocaleString()} fill="bg-tile-yellow" icon={ChalkboardTeacher} note={weekNote(week?.teachers, 'teacher', 'teachers')} to="/teachers" />
            <KpiTile label="Parents" value={s.totalParents.toLocaleString()} fill="bg-tile-blue" icon={UsersThree} note={`${s.totalClasses} ${s.totalClasses === 1 ? 'class' : 'classes'} running`} to="/parents" />
          </KpiRow>

          <WeekCalendar items={data?.academicCalendar ?? []} />

          <Panel
            title="Students"
            description={studentView === 'recent' ? 'Most recently added' : `${distribution.length} classes with students`}
            flush
            action={
              <div className="flex items-center gap-2">
                <Tabs value={studentView} onValueChange={(v) => setStudentView(v as 'recent' | 'classes')}>
                  <TabsList className="h-9">
                    <TabsTrigger value="recent" className="px-3 py-1 text-xs">Recently added</TabsTrigger>
                    <TabsTrigger value="classes" className="px-3 py-1 text-xs">By class</TabsTrigger>
                  </TabsList>
                </Tabs>
                <PanelLink to="/students">View all</PanelLink>
              </div>
            }
          >
            {studentView === 'recent' ? (
              recent.length === 0 ? (
                <EmptyState icon={Student} text="No students yet. Add your first student to see them here." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="pl-6">Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Parent / email</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="w-12 pr-6"><span className="sr-only">Open</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recent.map((st, i) => (
                        <TableRow key={st._id} className="cursor-pointer" onClick={() => navigate(`/students/${st._id}`)}>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-tile-foreground', TILE_FILLS[i % TILE_FILLS.length])}>
                                {initials(st.name)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">{st.name}</p>
                                <p className="text-xs text-muted-foreground">{st.admissionNumber} · added {timeAgo(st.createdAt)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><DotPill tone={st.status === 'Active' ? 'success' : 'muted'}>{st.status}</DotPill></TableCell>
                          <TableCell className="text-sm text-muted-foreground"><span className="block max-w-[220px] truncate">{st.email || st.parentName || '—'}</span></TableCell>
                          <TableCell>
                            {st.className
                              ? <span className="rounded-md bg-tile-blue px-2 py-0.5 text-xs font-medium text-tile-foreground">{st.className}</span>
                              : <span className="text-xs text-muted-foreground">No class</span>}
                          </TableCell>
                          <TableCell className="pr-6">
                            <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={`Open ${st.name}`}
                              onClick={(e) => { e.stopPropagation(); navigate(`/students/${st._id}`); }}>
                              <PencilSimple size={15} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : distribution.length === 0 ? (
              <EmptyState icon={UsersThree} text="No students are in a class yet." />
            ) : (
              <CardContent className="space-y-3 pt-5">
                {distribution.map((c) => {
                  const pct = s.totalStudents ? Math.round((c.value / s.totalStudents) * 100) : 0;
                  return (
                    <div key={c.name} className="grid grid-cols-[120px_1fr_64px] items-center gap-3 text-sm">
                      <span className="truncate font-medium">{c.name}</span>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/80" style={{ width: `${pct}%` }} /></div>
                      <span className="text-right tabular-nums text-muted-foreground">{c.value} · {pct}%</span>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Panel>

          <AttendancePanel weekly={data?.attendanceOverview?.weeklyData ?? []} rate={data?.attendanceOverview?.attendanceRate} />
        </>}
        side={<>
          <QuickActions actions={[
            { label: 'Add Student', icon: Plus, to: '/students', state: { openCreate: true } },
            { label: 'Add Teacher', icon: Plus, to: '/teachers', state: { openCreate: true } },
            { label: 'Collect Fees', icon: Coins, to: '/finance' },
            { label: 'Attendance', icon: CalendarCheck, to: '/attendance' },
          ]} />

          <Panel title="Fees" action={<PanelLink to="/finance?tab=report">Report</PanelLink>}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Collected" value={money(feesCollected)} fill="bg-tile-green" />
                <MiniStat label="Still owed" value={money(feesOutstanding)} fill="bg-tile-pink" />
              </div>
              <ProgressLine label="Collected so far" percent={collectionRate} />
            </div>
          </Panel>

          <ActivityFeed items={data?.recentActivity ?? []} />

          <DonutBreakdown title="Student breakdown" description="Active students by class" data={distribution}
            centerLabel="Students" emptyText="No students in classes yet." />
        </>}
      />
    </div>
  );
}
