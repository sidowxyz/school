import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartBar, CheckSquare, FileText, SpinnerGap, type Icon } from '@phosphor-icons/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/common/PageHeader';
import { attendanceService, type ClassData, type SectionData, type Term } from '../../../services/attendance.service';
import OverviewTab from '../components/OverviewTab';
import TakeAttendanceTab from '../components/TakeAttendanceTab';
import MonthlyReportTab from '../components/MonthlyReportTab';

type Tab = 'overview' | 'take' | 'report';

const TABS: { value: Tab; label: string; icon: Icon }[] = [
  { value: 'overview', label: 'Overview', icon: ChartBar },
  { value: 'take', label: 'Take Attendance', icon: CheckSquare },
  { value: 'report', label: 'Monthly Report', icon: FileText },
];

const isTab = (v: string | null): v is Tab => TABS.some((t) => t.value === v);

export default function StudentAttendancePage() {
  // The open tab lives in the URL (?tab=take) so refresh and links keep it.
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'overview';
  const openTab = (value: string) => {
    if (isTab(value)) setParams(value === 'overview' ? {} : { tab: value }, { replace: true });
  };

  // Terms, classes and sections are shared by the take and report tabs. The
  // overview doesn't need them, so it renders straight away while they load.
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [refsReady, setRefsReady] = useState(false);

  useEffect(() => {
    Promise.all([attendanceService.getTerms(), attendanceService.getClasses(), attendanceService.getSections()])
      .then(([t, c, s]) => { setTerms(t); setClasses(c); setSections(s); })
      .catch(() => undefined)
      .finally(() => setRefsReady(true));
  }, []);

  const waiting = <div className="flex justify-center py-20"><SpinnerGap size={28} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Take daily attendance and see who is missing school."
      />

      <Tabs value={tab} onValueChange={openTab} className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
          {TABS.map(({ value, label, icon: TabIcon }) => (
            <TabsTrigger key={value} value={value} className="gap-2">
              <TabIcon size={16} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <OverviewTab onTakeAttendance={() => openTab('take')} />
        </TabsContent>
        <TabsContent value="take" className="mt-0">
          {refsReady ? <TakeAttendanceTab terms={terms} classes={classes} sections={sections} /> : waiting}
        </TabsContent>
        <TabsContent value="report" className="mt-0">
          {refsReady ? <MonthlyReportTab classes={classes} sections={sections} /> : waiting}
        </TabsContent>
      </Tabs>
    </div>
  );
}
