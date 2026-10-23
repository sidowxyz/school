import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SquaresFour, User, ClipboardText, CalendarBlank, BookOpen, CurrencyDollar, Gear, UserCircle, CaretLeft } from '@phosphor-icons/react';

import { useAuth } from '../../../hooks/useAuth';
import type { Student } from '../../students/types';
import { studentsApi } from '../../students/api/studentsApi';
import AdminStudentSearch from './AdminStudentSearch';
import { portalApi } from '../api/portalApi';
import { PortalProvider } from '../context/PortalContext';
import ProfileContextBanner from '../components/ProfileContextBanner';
import DashboardTab from '../components/tabs/DashboardTab';
import ProfileTab from '../components/tabs/ProfileTab';
import AttendanceTab from '../components/tabs/AttendanceTab';
import TimetableTab from '../components/tabs/TimetableTab';
import SubjectsTab from '../components/tabs/SubjectsTab';
import AssignmentsTab from '../components/tabs/AssignmentsTab';
import FeesTab from '../components/tabs/FeesTab';
import SettingsTab from '../components/tabs/SettingsTab';
import { TAB_IDS, type TabId } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type TabDef = { id: TabId; label: string; icon: React.ElementType; badge?: number };


function StudentPortalContent({ student }: { student: Student | null }) {
  const { role } = useAuth();
  const isStudent = role === 'student';
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: TabId = TAB_IDS.includes(rawTab as TabId) ? (rawTab as TabId) : 'dashboard';

  const setTab = (next: TabId) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('tab', next);
      return params;
    });
  };

  const tabs: TabDef[] = [
    { id: 'dashboard',     label: 'Dashboard',     icon: SquaresFour },
    { id: 'profile',       label: 'My Profile',    icon: User },
    { id: 'attendance',    label: 'Attendance',    icon: ClipboardText },
    { id: 'timetable',     label: 'Timetable',     icon: CalendarBlank },
    { id: 'subjects',      label: 'Subjects',      icon: BookOpen },
    { id: 'assignments',   label: 'Assignments',   icon: ClipboardText },
    { id: 'fees',          label: 'Fees',          icon: CurrencyDollar },
    { id: 'settings',      label: 'Settings',      icon: Gear },
  ];

  const TabButton = ({ t }: { t: TabDef }) => {
    const isActive = tab === t.id;
    return (
      <Button
        variant="plain"
        size="sm"
        onClick={() => setTab(t.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap rounded-lg transition-all cursor-pointer ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        }`}
      >
        <t.icon className="h-3.5 w-3.5" />
        <span>{t.label}</span>
        {!!t.badge && (
          <Badge
            variant={isActive ? 'secondary' : 'destructive'}
            className="ml-1 h-4 px-1 text-[10px] leading-none"
          >
            {t.badge}
          </Badge>
        )}
      </Button>
    );
  };

  // Vertical (sidebar) button.
  const SideButton = ({ t }: { t: TabDef }) => {
    const isActive = tab === t.id;
    return (
      <Button
        variant="plain"
        size="sm"
        onClick={() => setTab(t.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center justify-start gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        }`}
      >
        <t.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{t.label}</span>
        {!!t.badge && (
          <Badge
            variant={isActive ? 'secondary' : 'destructive'}
            className="ml-auto h-4 px-1 text-[10px] leading-none"
          >
            {t.badge}
          </Badge>
        )}
      </Button>
    );
  };

  const tabContent = (
    <>
      {tab === 'dashboard'     && <DashboardTab onNavigate={setTab} />}
      {tab === 'profile'       && <ProfileTab student={student} />}
      {tab === 'attendance'    && <AttendanceTab />}
      {tab === 'timetable'     && <TimetableTab />}
      {tab === 'subjects'      && <SubjectsTab />}
      {tab === 'assignments'   && <AssignmentsTab />}
      {tab === 'fees'          && <FeesTab />}
      {tab === 'settings'      && <SettingsTab />}
    </>
  );

  // A logged-in student navigates via the app-level portal sidebar, so the
  // content spans full width. An admin viewing a student keeps the in-content
  // nav, since their left sidebar is the global admin one.
  if (isStudent) {
    return (
      <div className="space-y-5">
        <ProfileContextBanner student={student} />
        {tabContent}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ProfileContextBanner student={student} />

      {/* Tabs as a scrollable bar on small screens */}
      <div className="lg:hidden bg-card border border-border/80 shadow-2xs rounded-xl p-1.5 print:hidden">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => <TabButton key={t.id} t={t} />)}
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Left sidebar — all portal tabs */}
        <aside className="hidden lg:block w-60 shrink-0 print:hidden">
          <Card className="p-2 space-y-1 sticky top-4 border-border/80 shadow-2xs">
            <div className="px-3 pt-2 pb-2 flex items-center justify-between border-b border-border/50 mb-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Student Portal
              </span>
              <Badge variant="secondary" className="text-[10px] font-medium h-4 px-1.5">
                {tabs.length} tabs
              </Badge>
            </div>
            <div className="space-y-0.5">
              {tabs.map((t) => <SideButton key={t.id} t={t} />)}
            </div>
          </Card>
        </aside>

        <div className="flex-1 min-w-0 space-y-5">
          {/* Quick horizontal tabs strip */}
          <div className="bg-card border border-border/80 shadow-2xs rounded-xl p-1.5 print:hidden">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {tabs.map((t) => <TabButton key={t.id} t={t} />)}
            </div>
          </div>

          {tabContent}
        </div>
      </div>
    </div>
  );
}

// Strip shown to admins/staff so they always know whose portal they're viewing,
// with a one-click way to go back and pick a different student.
function ViewingBanner({ student, onChange }: { student: Student; onChange: () => void }) {
  return (
    <Card className="border-border/80 bg-muted/40 shadow-2xs mb-4">
      <CardContent className="p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <UserCircle className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs sm:text-sm text-foreground truncate">
            Viewing portal for{' '}
            <span className="font-semibold text-foreground">
              {student.firstName} {student.lastName}
            </span>{' '}
            <span className="text-muted-foreground font-mono text-xs">({student.admissionNumber})</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onChange}
          className="shrink-0 flex items-center gap-1.5 text-xs h-8"
        >
          <CaretLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Change student</span>
          <span className="sm:hidden">Change</span>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StudentPortalPage() {
  const { role } = useAuth();
  const isStudent = role === 'student';

  // Admin/staff must search for and select a student first; a logged-in student
  // sees their own portal directly.
  const [selected, setSelected] = useState<Student | null>(null);
  const [meProfile, setMeProfile] = useState<Student | null>(null);
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get('studentId');

  // If navigated directly with ?studentId=..., load that student automatically
  useEffect(() => {
    if (isStudent || !studentIdParam || selected?._id === studentIdParam) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await studentsApi.getById(studentIdParam);
        if (!cancelled && s) setSelected(s);
      } catch (err) {
        console.error('Failed to load student for portal preview', err);
      }
    })();
    return () => { cancelled = true; };
  }, [isStudent, studentIdParam, selected]);

  // A logged-in student loads their own real profile.
  useEffect(() => {
    if (!isStudent) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await portalApi.getMyProfile();
        if (!cancelled) setMeProfile(p);
      } catch {
        // Leave null — the profile shows its loading/empty state; nothing is invented.
      }
    })();
    return () => { cancelled = true; };
  }, [isStudent]);

  if (!isStudent && !selected) {
    return <AdminStudentSearch onSelect={setSelected} />;
  }

  const student = isStudent ? meProfile : selected;
  // Students use the self routes (no id); admins pass the selected student's id.
  const studentId = isStudent ? undefined : selected?._id;

  return (
    <PortalProvider value={{ student, studentId }}>
      {!isStudent && selected && (
        <ViewingBanner student={selected} onChange={() => setSelected(null)} />
      )}
      <StudentPortalContent student={student} />
    </PortalProvider>
  );
}
