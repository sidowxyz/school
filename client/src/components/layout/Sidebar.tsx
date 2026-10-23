import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  SquaresFour,
  CalendarCheck,
  CalendarBlank,
  Buildings,
  Notebook,
  Student,
  ChalkboardTeacher,
  CheckSquareOffset,
  UsersThree,
  Coins,
  ChartLineUp,
  ShieldCheck,
  GearSix,
  SidebarSimple,
  type Icon,
} from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';
import { useSchoolIdentity } from '../../features/settings/hooks/useSchoolIdentity';
import { roleCanAccess } from '../../hooks/usePermission';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem { label: string; path: string; icon: Icon; module: string }
interface NavSection { title: string; items: NavItem[] }

// One flat list per section — every page is a single click away.
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
      { label: 'Teaching Logs', path: '/teaching-log', icon: Notebook, module: 'teaching-log' },
      { label: 'Academic Structure', path: '/academic-structure', icon: Buildings, module: 'academic-structure' },
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
    ],
  },
];

const getDashboardPath = (role: string | undefined): string => {
  const map: Record<string, string> = {
    admin: '/dashboard/admin',
    principal: '/dashboard/principal',
    academic_officer: '/dashboard/academic-officer',
    teacher: '/dashboard/teacher',
    accountant: '/dashboard/accountant',
    student: '/dashboard/student',
    parent: '/parent-portal',
  };
  return role ? (map[role] ?? '/login') : '/login';
};

function NavItemLink({ label, path, icon: ItemIcon, collapsed, onMobileClose }: {
  label: string; path: string; icon: Icon; collapsed: boolean; onMobileClose?: () => void;
}) {
  return (
    <NavLink
      to={path}
      title={collapsed ? label : undefined}
      onClick={onMobileClose}
      className={({ isActive }) => cn(
        'group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
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
  const { role } = useAuth();
  const { schoolName, logoSrc } = useSchoolIdentity();

  const sections = navSections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => roleCanAccess(role, item.module))
        .map((item) => (item.module === 'dashboard' ? { ...item, path: getDashboardPath(role) } : item)),
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
              onError={(event) => {
                if (!event.currentTarget.src.endsWith('/logo.png')) event.currentTarget.src = '/logo.png';
                else event.currentTarget.style.display = 'none';
              }}
            />
            <div className="min-w-0">
              <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">{schoolName}</p>
              <p className="truncate text-[11px] text-muted-foreground">School management</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((c) => !c)}
          className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <SidebarSimple size={18} />
        </Button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2 scrollbar-thin">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[11px] font-medium text-muted-foreground/80">{section.title}</p>
            )}
            {section.items.map((item) => (
              <NavItemLink key={item.path} {...item} collapsed={collapsed} onMobileClose={onMobileClose} />
            ))}
          </div>
        ))}
      </nav>

      {roleCanAccess(role, 'settings') && (
        <div className="shrink-0 border-t border-border p-3">
          <NavItemLink label="Settings" path="/settings" icon={GearSix} collapsed={collapsed} onMobileClose={onMobileClose} />
        </div>
      )}
    </aside>
  );
}
