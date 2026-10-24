import { useEffect, useMemo, useState } from 'react';
import { CalendarBlank, ChalkboardTeacher, ChartBar, ShieldCheck, Student, UsersThree } from '@phosphor-icons/react';
import { getDashboardData } from '../../../services/dashboardService';
import {
  ActivityFeed, AttendancePanel, ClassSizeBars, DashboardColumns, DashboardError, DashboardHeader, DashboardLoading, DonutBreakdown, KpiRow, KpiTile, MiniStat, Panel, PanelLink, ProgressLine, QuickActions, WeekCalendar,
} from '../components/DashboardKit';
import { money } from '../components/dashboardUtils';
import type { SchoolKpis } from './AdminDashboard';

export default function PrincipalDashboard() {
  const [data, setData] = useState<SchoolKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardData().then((dash) => {
      if (dash) setData(dash);
      else setError('Could not load dashboard figures from the server.');
    }).catch(() => setError('Could not load dashboard figures from the server.'))
      .finally(() => setLoading(false));
  }, []);

  const distribution = useMemo(() => (data?.studentDistribution ?? []).filter((d) => d.value > 0), [data]);

  if (loading) return <DashboardLoading />;

  const s = data?.summary ?? { totalStudents: 0, totalTeachers: 0, totalParents: 0, totalClasses: 0 };
  const week = data?.newThisWeek;
  const attendanceRate = data?.attendanceOverview?.attendanceRate ?? 0;
  const fees = data?.feeCollectionSummary;
  const feesRate = fees?.totalExpected ? Math.round(((fees.totalCollected ?? 0) / fees.totalExpected) * 100) : 0;

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <DashboardError message={error} />

      <DashboardColumns
        main={<>
          <KpiRow>
            <KpiTile label="Total students" value={s.totalStudents.toLocaleString()} fill="bg-tile-pink" icon={Student}
              note={week?.students ? `+${week.students} new this week` : 'Active students'} to="/students" />
            <KpiTile label="Teachers" value={s.totalTeachers.toLocaleString()} fill="bg-tile-yellow" icon={ChalkboardTeacher}
              note="Teaching staff on the roster" to="/teachers" />
            <KpiTile label="Parents" value={s.totalParents.toLocaleString()} fill="bg-tile-blue" icon={UsersThree}
              note={`${s.totalClasses} ${s.totalClasses === 1 ? 'class' : 'classes'} running`} to="/parents" />
          </KpiRow>

          <WeekCalendar items={data?.academicCalendar ?? []} />

          <Panel title="Students per class" description="Active students in each class" action={<PanelLink to="/students">Students</PanelLink>}>
            <ClassSizeBars data={distribution} total={s.totalStudents} />
          </Panel>

          <AttendancePanel weekly={data?.attendanceOverview?.weeklyData ?? []} rate={attendanceRate} />
        </>}
        side={<>
          <QuickActions actions={[
            { label: 'Students', icon: Student, to: '/students' },
            { label: 'Reports', icon: ChartBar, to: '/reports' },
            { label: 'Timetable', icon: CalendarBlank, to: '/timetable' },
            { label: 'Staff attendance', icon: ShieldCheck, to: '/teacher-attendance' },
          ]} />

          <Panel title="School health">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Classes" value={String(s.totalClasses)} fill="bg-tile-violet" />
              <MiniStat label="Attendance" value={attendanceRate ? `${attendanceRate}%` : '—'} fill="bg-tile-green" />
            </div>
          </Panel>

          {fees && (
            <Panel title="Fees" action={<PanelLink to="/reports">Reports</PanelLink>}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Collected" value={money(fees.totalCollected ?? 0)} fill="bg-tile-green" />
                  <MiniStat label="Still owed" value={money(fees.totalPending ?? 0)} fill="bg-tile-pink" />
                </div>
                <ProgressLine label="Collected so far" percent={feesRate} />
              </div>
            </Panel>
          )}

          <ActivityFeed items={data?.recentActivity ?? []} />

          <DonutBreakdown title="Student breakdown" description="Active students by class" data={distribution}
            centerLabel="Students" emptyText="No students in classes yet." />
        </>}
      />
    </div>
  );
}
