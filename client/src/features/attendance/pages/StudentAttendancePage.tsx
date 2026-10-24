import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartBar, CheckSquare, FileText, SpinnerGap, type Icon } from '@phosphor-icons/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/common/PageHeader';
import { attendanceService, type ClassData, type SectionData, type Term } from '../../../services/attendance.service';
import OverviewTab from '../components/OverviewTab';
import TakeAttendanceTab from '../components/TakeAttendanceTab';
import MonthlyReportTab from '../components/MonthlyReportTab';
import { useCan } from '../../../hooks/usePermission';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/axios';

type Tab = 'overview' | 'take' | 'report';

const TABS: { value: Tab; label: string; icon: Icon }[] = [
  { value: 'overview', label: 'Overview', icon: ChartBar },
  { value: 'take', label: 'Take Attendance', icon: CheckSquare },
  { value: 'report', label: 'Monthly Report', icon: FileText },
];

const isTab = (v: string | null): v is Tab => TABS.some((t) => t.value === v);

export default function StudentAttendancePage() {
  const canTake = useCan('attendance', 'create');
  const { role } = useAuth();
  const tabs = TABS.filter((t) => t.value !== 'take' || canTake);
  // The open tab lives in the URL (?tab=take) so refresh and links keep it.
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) && tabs.some((t) => t.value === tabParam) ? tabParam : 'overview';
  const openTab = (value: string) => {
    if (isTab(value)) setParams(value === 'overview' ? {} : { tab: value }, { replace: true });
  };

  // Terms, classes and sections are shared by the take and report tabs. The
  // overview doesn't need them, so it renders straight away while they load.
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [refsReady, setRefsReady] = useState(false);
  const [refsError, setRefsError] = useState('');

  useEffect(() => {
    // A teacher only sees the classes and sections they teach.
    const own = role === 'teacher'
      ? api.get('/teachers/me/timetable').then((r) => r.data.data as { classId?: { _id: string } | string; sectionId?: { _id: string } | string }[])
      : Promise.resolve(null);
    Promise.all([attendanceService.getTerms(), attendanceService.getClasses(), attendanceService.getSections(), own])
      .then(([t, c, s, mine]) => {
        setTerms(t);
        if (mine) {
          const idOf = (v: { _id: string } | string | undefined) => (typeof v === 'string' ? v : v?._id);
          const classIds = new Set(mine.map((a) => idOf(a.classId)));
          const sectionIds = new Set(mine.map((a) => idOf(a.sectionId)));
          setClasses(c.filter((x) => classIds.has(x._id)));
          setSections(s.filter((x) => sectionIds.has(x._id)));
        } else {
          setClasses(c);
          setSections(s);
        }
      })
      .catch(() => setRefsError('Could not load classes and terms. Refresh the page to try again.'))
      .finally(() => setRefsReady(true));
  }, [role]);

  const waiting = <div className="flex justify-center py-20"><SpinnerGap size={28} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Mark daily attendance and see who is absent."
      />

      <Tabs value={tab} onValueChange={openTab} className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
          {tabs.map(({ value, label, icon: TabIcon }) => (
            <TabsTrigger key={value} value={value} className="gap-2">
              <TabIcon size={16} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <OverviewTab onTakeAttendance={canTake ? () => openTab('take') : undefined} />
        </TabsContent>
        <TabsContent value="take" className="mt-0">
          {!refsReady ? waiting : refsError ? <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{refsError}</p> : <TakeAttendanceTab terms={terms} classes={classes} sections={sections} />}
        </TabsContent>
        <TabsContent value="report" className="mt-0">
          {!refsReady ? waiting : refsError ? <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{refsError}</p> : <MonthlyReportTab classes={classes} sections={sections} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
