import { useEffect, useMemo, useState } from 'react';
import { ChalkboardTeacher, Coins, DownloadSimple, CalendarCheck, Exam, Plus, Student, UsersThree } from '@phosphor-icons/react';
import { getDashboardData, getFinanceDashboardData } from '../../../services/dashboardService';
import { downloadCSV } from '../../reports/utils/csv';
import {
  ActivityFeed, AttendancePanel, DashboardError, DashboardLoading, DonutBreakdown, KpiRow, KpiTile, QuickActions, WeekCalendar, type ActivityItem, type CalendarItem,
} from '../components/DashboardKit';
import { money } from '../components/dashboardUtils';

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
  const [data, setData] = useState<SchoolKpis | null>(null);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      <DashboardError message={loadError} />

      <KpiRow columns={4}>
        <KpiTile label="Total students" value={s.totalStudents.toLocaleString()} fill="bg-tile-pink" icon={Student} note={weekNote(week?.students, 'student', 'students')} to="/students" />
        <KpiTile label="Teachers" value={s.totalTeachers.toLocaleString()} fill="bg-tile-yellow" icon={ChalkboardTeacher} note={weekNote(week?.teachers, 'teacher', 'teachers')} to="/teachers" />
        <KpiTile label="Parents" value={s.totalParents.toLocaleString()} fill="bg-tile-blue" icon={UsersThree} note={`${s.totalClasses} ${s.totalClasses === 1 ? 'class' : 'classes'} running`} to="/parents" />
        <KpiTile label="Fees collected" value={money(feesCollected)} fill="bg-tile-green" icon={Coins} note={feesTotal > 0 ? `${collectionRate}% collected · ${money(feesOutstanding)} still owed` : 'No fees billed yet'} to="/finance?tab=report" />
      </KpiRow>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutBreakdown title="Student breakdown" description="Active students by class" data={distribution}
          centerLabel="Students" emptyText="No students in classes yet." />
        <QuickActions title="Quick actions" description="The jobs you do most, one click away" actions={[
          { label: 'Add Student', icon: Plus, to: '/students', state: { openCreate: true } },
          { label: 'Add Teacher', icon: Plus, to: '/teachers', state: { openCreate: true } },
          { label: 'Collect Fees', icon: Coins, to: '/finance' },
          { label: 'Attendance', icon: CalendarCheck, to: '/attendance' },
          { label: 'Exams & marks', icon: Exam, to: '/exams' },
          { label: 'Export summary', icon: DownloadSimple, onClick: exportCsv },
        ]} />
      </div>

      <WeekCalendar items={data?.academicCalendar ?? []} />

      <AttendancePanel weekly={data?.attendanceOverview?.weeklyData ?? []} rate={data?.attendanceOverview?.attendanceRate} />

      <ActivityFeed items={data?.recentActivity ?? []} />
    </div>
  );
}
