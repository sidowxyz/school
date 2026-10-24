import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Buildings, CalendarBlank, CalendarCheck, ChalkboardTeacher, ChartBar, Exam } from '@phosphor-icons/react';
import { getDashboardData } from '../../../services/dashboardService';
import { academicApi } from '../../academic-structure/api/academicApi';
import type { Term } from '../../academic-structure/types';
import {
  ClassSizeBars, DashboardError, DashboardLoading, DonutBreakdown, KpiRow, KpiTile, Panel, PanelLink, QuickActions, WeekCalendar,
} from '../components/DashboardKit';
import type { SchoolKpis } from './AdminDashboard';

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

/** How far through the term today is, 0–100. */
function termProgress(term: Term) {
  if (!term.startDate || !term.endDate) return null;
  const start = new Date(term.startDate).getTime();
  const end = new Date(term.endDate).getTime();
  if (end <= start) return null;
  return Math.round(Math.min(1, Math.max(0, (Date.now() - start) / (end - start))) * 100);
}

export default function AcademicOfficerDashboard() {
  const [data, setData] = useState<SchoolKpis | null>(null);
  const [subjectCount, setSubjectCount] = useState<number | null>(null);
  const [term, setTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([getDashboardData(), academicApi.getSubjects(), academicApi.getTerms()])
      .then(([dash, subjects, terms]) => {
        if (dash.status === 'fulfilled' && dash.value) setData(dash.value);
        else setError('Could not load school figures from the server.');
        if (subjects.status === 'fulfilled') setSubjectCount(subjects.value.length);
        if (terms.status === 'fulfilled') setTerm(terms.value.find((t) => t.status === 'active') ?? null);
        setLoading(false);
      });
  }, []);

  const distribution = useMemo(() => (data?.studentDistribution ?? []).filter((d) => d.value > 0), [data]);

  if (loading) return <DashboardLoading />;

  const s = data?.summary ?? { totalStudents: 0, totalTeachers: 0, totalParents: 0, totalClasses: 0 };
  const progress = term ? termProgress(term) : null;

  return (
    <div className="space-y-6">
      <DashboardError message={error} />

      <KpiRow columns={4}>
        <KpiTile label="Classes" value={s.totalClasses} fill="bg-tile-pink" icon={Buildings}
          note={`${s.totalStudents.toLocaleString()} students in school`} to="/academic-structure" />
        <KpiTile label="Subjects" value={subjectCount ?? '—'} fill="bg-tile-yellow" icon={BookOpen}
          note="Taught across the school" to="/academic-structure?step=Subjects" />
        <KpiTile label="Teachers" value={s.totalTeachers} fill="bg-tile-blue" icon={ChalkboardTeacher}
          note="Teaching staff on the roster" to="/timetable" />
        <KpiTile label="Current term" value={term?.name ?? 'None'} fill="bg-tile-violet" icon={CalendarCheck}
          note={term ? `${progress !== null ? `${progress}% done · ` : ''}ends ${fmtDate(term.endDate)}` : 'No term is marked active'}
          to="/academic-structure?step=Terms" />
      </KpiRow>

      <div className="grid gap-6 lg:grid-cols-2">
        <DonutBreakdown title="Student breakdown" description="Active students by class" data={distribution}
          centerLabel="Students" emptyText="No students in classes yet." />
        <QuickActions title="Quick actions" description="The jobs you do most, one click away" actions={[
          { label: 'Timetable', icon: CalendarBlank, to: '/timetable' },
          { label: 'Structure', icon: Buildings, to: '/academic-structure' },
          { label: 'Subjects', icon: BookOpen, to: '/academic-structure?step=Subjects' },
          { label: 'Exams & marks', icon: Exam, to: '/exams' },
          { label: 'Terms', icon: CalendarCheck, to: '/academic-structure?step=Terms' },
          { label: 'Reports', icon: ChartBar, to: '/reports' },
        ]} />
      </div>

      <WeekCalendar items={data?.academicCalendar ?? []} />

      <Panel title="Students per class" description="Active students in each class" action={<PanelLink to="/academic-structure">Classes</PanelLink>}>
        <ClassSizeBars data={distribution} total={s.totalStudents} />
      </Panel>
    </div>
  );
}
