import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  SquaresFour,
  CalendarCheck,
  GraduationCap,
  CalendarBlank,
  Exam,
  Buildings,
  Student,
  UserList,
  TrendUp,
  ChalkboardTeacher,
  IdentificationCard,
  CheckSquareOffset,
  Notebook,
  UsersThree,
  AddressBook,
  Coins,
  Books,
  ChatTeardropDots,
  ChartLineUp,
  ShieldCheck,
  GearSix,
  CaretDown,
  SidebarSimple,
} from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';
import { useSchoolIdentity } from '../../features/settings/hooks/useSchoolIdentity';
import { roleCanAccess } from '../../hooks/usePermission';
import { Button } from '@/components/ui/button';

// Nav structure
type NavItem = { type: 'item'; label: string; path: string; icon: React.ElementType; module: string };
type NavGroup = { type: 'group'; label: string; icon: React.ElementType; children: Omit<NavItem, 'type'>[] };
type NavEntry = NavItem | NavGroup;

interface NavSection {
  title: string;
  items: NavEntry[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { type: 'item', label: 'Dashboard', path: '/dashboard/admin', icon: SquaresFour, module: 'dashboard' },
    ],
  },
  {
    title: 'Teaching & Academics',
    items: [
      { type: 'item', label: 'Attendance', path: '/attendance', icon: CalendarCheck, module: 'attendance' },
      { type: 'item', label: 'Marks & Results', path: '/results', icon: GraduationCap, module: 'marks-results' },
      { type: 'item', label: 'Timetable', path: '/timetable', icon: CalendarBlank, module: 'timetable' },
      { type: 'item', label: 'Examinations', path: '/examinations', icon: Exam, module: 'examinations' },
      { type: 'item', label: 'Academic Structure', path: '/academic-structure', icon: Buildings, module: 'academic-structure' },
    ],
  },
  {
    title: 'People Management',
    items: [
      {
        type: 'group', label: 'Students', icon: Student,
        children: [
          { label: 'Student Directory', path: '/students', icon: UserList, module: 'students' },
          { label: 'Promotion', path: '/promotion', icon: TrendUp, module: 'student-promotion' },
        ],
      },
      {
        type: 'group', label: 'Faculty & Staff', icon: ChalkboardTeacher,
        children: [
          { label: 'Faculty Directory', path: '/teachers', icon: IdentificationCard, module: 'teachers' },
          { label: 'Staff Attendance', path: '/teacher-attendance', icon: CheckSquareOffset, module: 'teacher-attendance' },
          { label: 'Teaching Logs', path: '/teaching-log', icon: Notebook, module: 'teaching-log' },
        ],
      },
      {
        type: 'group', label: 'Parents & Guardians', icon: UsersThree,
        children: [
          { label: 'Guardians Directory', path: '/parents', icon: AddressBook, module: 'parents' },
        ],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      { type: 'item', label: 'Finance & Ledger', path: '/finance', icon: Coins, module: 'fees' },
      { type: 'item', label: 'Library', path: '/library', icon: Books, module: 'library' },
      { type: 'item', label: 'Communication', path: '/communication', icon: ChatTeardropDots, module: 'communication' },
      { type: 'item', label: 'Reports & Analytics', path: '/reports', icon: ChartLineUp, module: 'reports' },
      { type: 'item', label: 'User Accounts', path: '/users', icon: ShieldCheck, module: 'users' },
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

// Shared nav link style with comfortable ergonomics and eye-friendly padding
function NavItemComponent({
  label, path, icon: Icon, collapsed, sub = false, onMobileClose,
}: {
  label: string; path: string; icon: React.ElementType;
  collapsed: boolean; sub?: boolean; onMobileClose?: () => void;
}) {
  return (
    <NavLink
      to={path}
      title={collapsed ? label : undefined}
      onClick={onMobileClose}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all mb-1 ${
          collapsed ? 'justify-center px-2 py-2.5' : sub ? 'pl-7 py-2 text-[12px]' : ''
        } ${
          isActive
            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={collapsed ? 18 : 16} className={`shrink-0 transition-colors ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

// Group Component with smooth toggle and clear indentation
function NavGroupComponent({
  group, collapsed, onMobileClose,
}: {
  group: NavGroup; collapsed: boolean; onMobileClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = group.icon;

  if (collapsed) {
    return (
      <div className="mb-1">
        {group.children.map(child => (
          <NavItemComponent key={child.path} {...child} collapsed={collapsed} onMobileClose={onMobileClose} />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <Button
        variant="ghost"
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 h-auto rounded-lg text-xs font-medium text-foreground/85 hover:bg-muted/80 hover:text-foreground transition-colors group"
      >
        <span className="flex items-center gap-3">
          <Icon size={16} className="text-muted-foreground group-hover:text-foreground shrink-0" />
          <span className="truncate">{group.label}</span>
        </span>
        <CaretDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </Button>

      {open && (
        <div className="mt-1 pl-2 space-y-0.5 border-l border-border/70 ml-4 py-0.5">
          {group.children.map(child => (
            <NavItemComponent key={child.path} {...child} collapsed={collapsed} sub onMobileClose={onMobileClose} />
          ))}
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  onMobileClose?: () => void;
}

export default function Sidebar({ onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { role } = useAuth();
  const { schoolName, logoSrc } = useSchoolIdentity();

  const filteredSections = navSections
    .map(section => {
      const filteredItems = section.items
        .map(entry => {
          if (entry.type === 'item') {
            if (entry.module === 'timetable' && role === 'teacher') {
              return { ...entry, path: '/timetable' };
            }
            if (!roleCanAccess(role, entry.module)) return null;
            return entry.module === 'dashboard' ? { ...entry, path: getDashboardPath(role) } : entry;
          } else {
            const allowedChildren = entry.children.Funnel(child => roleCanAccess(role, child.module));
            return allowedChildren.length > 0 ? { ...entry, children: allowedChildren } : null;
          }
        })
        .Funnel((entry): entry is NavEntry => entry !== null);

      return filteredItems.length > 0 ? { ...section, items: filteredItems } : null;
    })
    .Funnel((section): section is NavSection => section !== null);

  return (
    <aside
      className={`bg-card text-card-foreground border-r border-border flex flex-col shrink-0 h-screen transition-all duration-300 select-none shadow-xs ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header — exact h-16 to perfectly align with TopBar bottom border */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logoSrc}
            alt={schoolName}
            className={`object-contain rounded-md transition-all ${collapsed ? 'w-8 h-8' : 'w-9 h-9'}`}
            onLoad={(event) => { event.currentTarget.style.display = 'block'; }}
            onError={(event) => {
              if (!event.currentTarget.src.endsWith('/logo.png')) event.currentTarget.src = '/logo.png';
              else event.currentTarget.style.display = 'none';
            }}
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold uppercase tracking-tight text-foreground truncate leading-tight">
                {schoolName}
              </h2>
              <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                School Management
              </p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(c => !c)}
          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-lg hover:bg-muted"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <SidebarSimple size={18} />
        </Button>
      </div>

      {/* Nav List — organized by clean, intuitive sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5 scrollbar-thin">
        {filteredSections.map((section, idx) => (
          <div key={section.title} className="space-y-0.5">
            {!collapsed && (
              <p className={`text-[10px] font-semibold text-muted-foreground/75 uppercase tracking-wider px-3.5 pb-1 select-none ${idx > 0 ? 'pt-2' : ''}`}>
                {section.title}
              </p>
            )}
            {section.items.map(entry =>
              entry.type === 'item' ? (
                <NavItemComponent
                  key={entry.path}
                  label={entry.label}
                  path={entry.path}
                  icon={entry.icon}
                  collapsed={collapsed}
                  onMobileClose={onMobileClose}
                />
              ) : (
                <NavGroupComponent
                  key={entry.label}
                  group={entry}
                  collapsed={collapsed}
                  onMobileClose={onMobileClose}
                />
              )
            )}
          </div>
        ))}
      </nav>

      {/* Settings bottom pin */}
      <div className="p-3 border-t border-border mt-auto shrink-0">
        <NavItemComponent
          label="Settings"
          path="/settings"
          icon={GearSix}
          collapsed={collapsed}
          onMobileClose={onMobileClose}
        />
      </div>
    </aside>
  );
}
