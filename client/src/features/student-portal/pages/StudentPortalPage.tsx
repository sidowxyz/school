import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SquaresFour, User, ClipboardText, CalendarBlank, BookOpen, CurrencyDollar, Gear, UserCircle, CaretLeft, type Icon } from '@phosphor-icons/react';

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
import FeesTab from '../components/tabs/FeesTab';
import SettingsTab from '../components/tabs/SettingsTab';
import { TAB_IDS, type TabId } from '../types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabDef = { id: TabId; label: string; icon: Icon };


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
    { id: 'fees',          label: 'Fees',          icon: CurrencyDollar },
    { id: 'settings',      label: 'Settings',      icon: Gear },
  ];

  const tabContent = (
    <>
      {tab === 'dashboard'     && <DashboardTab onNavigate={setTab} />}
      {tab === 'profile'       && <ProfileTab student={student} />}
      {tab === 'attendance'    && <AttendanceTab />}
      {tab === 'timetable'     && <TimetableTab />}
      {tab === 'subjects'      && <SubjectsTab />}
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

  // Staff viewing a student get the same tabs as a strip above the content.
  return (
    <div className="space-y-5">
      <ProfileContextBanner student={student} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="print:hidden">
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          {tabs.map(({ id, label, icon: TabIcon }) => (
            <TabsTrigger key={id} value={id} className="gap-2">
              <TabIcon size={16} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {tabContent}
    </div>
  );
}

// Strip shown to admins/staff so they always know whose portal they're viewing,
// with a one-click way to go back and pick a different student.
function ViewingBanner({ student, onChange }: { student: Student; onChange: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="flex min-w-0 items-center gap-2 truncate text-sm">
        <UserCircle size={18} className="shrink-0 text-muted-foreground" />
        Viewing the portal of <span className="font-semibold">{student.firstName} {student.lastName}</span>
        <span className="font-mono text-xs text-muted-foreground">{student.admissionNumber}</span>
      </p>
      <Button variant="outline" size="sm" onClick={onChange} className="h-8 shrink-0 gap-1.5">
        <CaretLeft size={14} /> <span className="hidden sm:inline">Change student</span><span className="sm:hidden">Change</span>
      </Button>
    </div>
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
