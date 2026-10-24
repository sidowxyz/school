import { useSearchParams } from 'react-router-dom';
import { ChartBar, CheckSquare, FileText, type Icon } from '@phosphor-icons/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/common/PageHeader';
import StaffOverviewTab from '../components/StaffOverviewTab';
import TakeStaffAttendanceTab from '../components/TakeStaffAttendanceTab';
import StaffMonthlyReportTab from '../components/StaffMonthlyReportTab';
import { useCan } from '../../../hooks/usePermission';

type Tab = 'overview' | 'take' | 'report';

const TABS: { value: Tab; label: string; icon: Icon }[] = [
  { value: 'overview', label: 'Overview', icon: ChartBar },
  { value: 'take', label: 'Take Attendance', icon: CheckSquare },
  { value: 'report', label: 'Monthly Report', icon: FileText },
];

const isTab = (v: string | null): v is Tab => TABS.some((t) => t.value === v);

/** Staff attendance: the same three simple tabs as student attendance. */
export default function TeacherAttendancePage() {
  const canTake = useCan('teacher-attendance', 'create');
  const tabs = TABS.filter((t) => t.value !== 'take' || canTake);
  // The open tab lives in the URL (?tab=take) so refresh and links keep it.
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) && tabs.some((t) => t.value === tabParam) ? tabParam : 'overview';
  const openTab = (value: string) => {
    if (isTab(value)) setParams(value === 'overview' ? {} : { tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Attendance" subtitle="Mark who is at work each day and see who is missing." />

      <Tabs value={tab} onValueChange={openTab} className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
          {tabs.map(({ value, label, icon: TabIcon }) => (
            <TabsTrigger key={value} value={value} className="gap-2">
              <TabIcon size={16} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-0"><StaffOverviewTab onTakeAttendance={canTake ? () => openTab('take') : undefined} /></TabsContent>
        <TabsContent value="take" className="mt-0"><TakeStaffAttendanceTab /></TabsContent>
        <TabsContent value="report" className="mt-0"><StaffMonthlyReportTab /></TabsContent>
      </Tabs>
    </div>
  );
}
