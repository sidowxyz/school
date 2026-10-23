import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SquaresFour, User, ClipboardText, CalendarBlank, BookOpen, CurrencyDollar, Gear, SidebarSimple } from '@phosphor-icons/react';
import { useSchoolIdentity } from '../../features/settings/hooks/useSchoolIdentity';
import { Button } from '@/components/ui/button';

type Item = { id: string; label: string; icon: React.ElementType };

const NAV: Item[] = [
  { id: 'dashboard',     label: 'Dashboard',     icon: SquaresFour },
  { id: 'profile',       label: 'My Profile',    icon: User },
  { id: 'attendance',    label: 'Attendance',    icon: ClipboardText },
  { id: 'timetable',     label: 'Timetable',     icon: CalendarBlank },
  { id: 'subjects',      label: 'Subjects',      icon: BookOpen },
  { id: 'assignments',   label: 'Assignments',   icon: ClipboardText },
  { id: 'fees',          label: 'Fees & Invoices', icon: CurrencyDollar },
];
const SETTINGS: Item = { id: 'settings', label: 'Settings', icon: Gear };

interface Props {
  onMobileClose?: () => void;
}

export default function StudentPortalSidebar({ onMobileClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const active = searchParams.get('tab') || 'dashboard';
  const { schoolName, logoSrc } = useSchoolIdentity();

  const go = (id: string) => {
    navigate(`/student-portal?tab=${id}`);
    onMobileClose?.();
  };

  const NavButton = ({ item }: { item: Item }) => {
    const isActive = active === item.id;
    const Icon = item.icon;
    return (
      <Button
        variant="ghost"
        type="button"
        onClick={() => go(item.id)}
        title={collapsed ? item.label : undefined}
        className={`w-full group flex items-center gap-3 px-3.5 py-2.5 h-auto rounded-lg text-xs font-medium transition-all mb-1 ${
          collapsed ? 'justify-center px-2 py-2.5' : ''
        } ${
          isActive
            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        }`}
      >
        <Icon size={collapsed ? 18 : 16} className={`shrink-0 transition-colors ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Button>
    );
  };

  return (
    <aside
      className={`bg-card text-card-foreground border-r border-border flex flex-col shrink-0 h-screen transition-all duration-300 select-none shadow-xs ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header — exact h-16 matching TopBar bottom border */}
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
                Student Portal
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
          {collapsed ? <SidebarSimple size={16} weight="fill" /> : <SidebarSimple size={16} />}
        </Button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Portal Navigation
          </p>
        )}
        {NAV.map((item) => <NavButton key={item.id} item={item} />)}
      </nav>

      {/* Settings Pin */}
      <div className="p-3 border-t border-border">
        <NavButton item={SETTINGS} />
      </div>
    </aside>
  );
}
