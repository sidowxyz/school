import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  SquaresFour,
  CalendarCheck,
  CalendarBlank,
  Notebook,
  Student,
  ChalkboardTeacher,
  CheckSquareOffset,
  UsersThree,
  Coins,
  ChartLineUp,
  ShieldCheck,
  Key,
  GearSix,
  SidebarSimple,
  Exam,
  type Icon,
} from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';
import { onLogoError, useSchoolIdentity } from '../../features/settings/hooks/useSchoolIdentity';
import { homePathFor, userCanAccess } from '../../hooks/usePermission';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem { label: string; path: string; icon: Icon; module: string }
interface NavSection { title: string; items: NavItem[] }

// Grouped by area. Groups are separated by a thin line instead of a heading, so
// every page fits on screen without the menu scrolling. Titles stay for screen readers.
const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard/admin', icon: SquaresFour, module: 'dashboard' },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'Attendance', path: '/attendance', icon: CalendarCheck, module: 'attendance' },
      { label: 'Timetable', path: '/timetable', icon: CalendarBlank, module: 'timetable' },
      { label: 'Exams & Marks', path: '/exams', icon: Exam, module: 'exams' },
      { label: 'Teaching Logs', path: '/teaching-log', icon: Notebook, module: 'teaching-log' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Students', path: '/students', icon: Student, module: 'students' },
      { label: 'Teachers', path: '/teachers', icon: ChalkboardTeacher, module: 'teachers' },
      { label: 'Staff Attendance', path: '/teacher-attendance', icon: CheckSquareOffset, module: 'teacher-attendance' },
      { label: 'Parents', path: '/parents', icon: UsersThree, module: 'parents' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Fees & Payments', path: '/finance', icon: Coins, module: 'fees' },
      { label: 'Reports', path: '/reports', icon: ChartLineUp, module: 'reports' },
      { label: 'User Accounts', path: '/users', icon: ShieldCheck, module: 'users' },
      { label: 'Roles & Access', path: '/roles', icon: Key, module: 'users' },
    ],
  },
];

function NavItemLink({ label, path, icon: ItemIcon, collapsed, onMobileClose }: {
  label: string; path: string; icon: Icon; collapsed: boolean; onMobileClose?: () => void;
}) {
  return (
    <NavLink
      to={path}
      title={collapsed ? label : undefined}
      onClick={onMobileClose}
      className={({ isActive }) => cn(
        'group flex h-9 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-0',
        isActive
          ? 'bg-tile-blue text-tile-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {({ isActive }) => (
        <>
          <ItemIcon size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

interface SidebarProps {
  onMobileClose?: () => void;
}

export default function Sidebar({ onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { schoolName, logoSrc } = useSchoolIdentity();

  const sections = navSections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => userCanAccess(user, item.module))
        .map((item) => (item.module === 'dashboard' ? { ...item, path: homePathFor(user) } : item)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className={cn('flex h-screen shrink-0 select-none flex-col border-r border-border bg-card transition-all duration-300', collapsed ? 'w-[72px]' : 'w-64')}>
      {/* Brand — h-16 so it lines up with the top bar */}
      <div className={cn('flex h-16 shrink-0 items-center gap-3 px-4', collapsed && 'justify-center px-2')}>
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src={logoSrc}
              alt=""
              className="h-9 w-9 shrink-0 rounded-xl object-contain"
              onError={onLogoError}
            />
            <p className="line-clamp-2 min-w-0 text-sm font-semibold leading-tight text-foreground">{schoolName}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <SidebarSimple size={18} />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3 pt-1 scrollbar-thin">
        {sections.map((section, i) => (
          <div key={section.title} role="group" aria-label={section.title} className="space-y-0.5">
            {i > 0 && <div aria-hidden className="mx-3 my-2 h-px bg-border/70" />}
            {section.items.map((item) => (
              <NavItemLink key={item.path} {...item} collapsed={collapsed} onMobileClose={onMobileClose} />
            ))}
          </div>
        ))}
      </nav>

      {['settings', 'academic-structure', 'audit-logs'].some((m) => userCanAccess(user, m)) && (
        <div className="shrink-0 border-t border-border px-3 py-2">
          <NavItemLink label="Settings" path="/settings" icon={GearSix} collapsed={collapsed} onMobileClose={onMobileClose} />
        </div>
      )}
    </aside>
  );
}
