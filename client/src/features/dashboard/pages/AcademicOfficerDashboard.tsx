import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Buildings, CalendarBlank, ChalkboardTeacher, ChartBar } from '@phosphor-icons/react';
import { getDashboardData } from '../../../services/dashboardService';
import { academicApi } from '../../academic-structure/api/academicApi';
import type { Term } from '../../academic-structure/types';
import {
  ClassSizeBars, DashboardColumns, DashboardError, DashboardHeader, DashboardLoading, DonutBreakdown, KpiRow, KpiTile, Panel, PanelLink, ProgressLine, QuickActions, WeekCalendar,
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
      <DashboardHeader />
      <DashboardError message={error} />

      <DashboardColumns
        main={<>
          <KpiRow>
            <KpiTile label="Classes" value={s.totalClasses} fill="bg-tile-pink" icon={Buildings}
              note={`${s.totalStudents.toLocaleString()} students in school`} to="/academic-structure" />
            <KpiTile label="Subjects" value={subjectCount ?? '—'} fill="bg-tile-yellow" icon={BookOpen}
              note="Taught across the school" to="/academic-structure" />
            <KpiTile label="Teachers" value={s.totalTeachers} fill="bg-tile-blue" icon={ChalkboardTeacher}
              note="Teaching staff on the roster" to="/timetable" />
          </KpiRow>

          <WeekCalendar items={data?.academicCalendar ?? []} />

          <Panel title="Students per class" description="Active students in each class">
            <ClassSizeBars data={distribution} total={s.totalStudents} />
          </Panel>
        </>}
        side={<>
          <QuickActions actions={[
            { label: 'Timetable', icon: CalendarBlank, to: '/timetable' },
            { label: 'Structure', icon: Buildings, to: '/academic-structure' },
            { label: 'Subjects', icon: BookOpen, to: '/academic-structure' },
            { label: 'Reports', icon: ChartBar, to: '/reports' },
          ]} />

          <Panel title="Current term" action={<PanelLink to="/academic-structure">Terms</PanelLink>}>
            {term ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-tile-violet p-4 text-tile-foreground">
                  <p className="text-lg font-semibold">{term.name}</p>
                  <p className="mt-0.5 text-xs opacity-75">
                    {typeof term.academicYearId === 'object' ? `${term.academicYearId.y_name} · ` : ''}{fmtDate(term.startDate)} – {fmtDate(term.endDate)}
                  </p>
                </div>
                {progress !== null && <ProgressLine label="Term completed" percent={progress} />}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">No term is marked active.</p>
            )}
          </Panel>

          <DonutBreakdown title="Student breakdown" description="Active students by class" data={distribution}
            centerLabel="Students" emptyText="No students in classes yet." />
        </>}
      />
    </div>
  );
}
