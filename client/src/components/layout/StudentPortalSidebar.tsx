import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SquaresFour, User, ClipboardText, CalendarBlank, BookOpen, CurrencyDollar, Gear, SidebarSimple, type Icon } from '@phosphor-icons/react';
import { onLogoError, useSchoolIdentity } from '../../features/settings/hooks/useSchoolIdentity';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Item = { id: string; label: string; icon: Icon };

// Same look as the staff sidebar: one flat list, current page in pastel blue.
const NAV: Item[] = [
  { id: 'dashboard', label: 'Dashboard', icon: SquaresFour },
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'attendance', label: 'Attendance', icon: ClipboardText },
  { id: 'timetable', label: 'Timetable', icon: CalendarBlank },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'fees', label: 'Fees', icon: CurrencyDollar },
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
    const ItemIcon = item.icon;
    return (
      <Button
        variant="plain"
        type="button"
        onClick={() => go(item.id)}
        title={collapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex h-10 w-full items-center justify-start gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-tile-blue text-tile-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <ItemIcon size={18} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Button>
    );
  };

  return (
    <aside className={cn('flex h-screen shrink-0 select-none flex-col border-r border-border bg-card transition-all duration-300', collapsed ? 'w-[72px]' : 'w-64')}>
      <div className={cn('flex h-16 shrink-0 items-center gap-3 px-4', collapsed && 'justify-center px-2')}>
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src={logoSrc}
              alt=""
              className="h-9 w-9 shrink-0 rounded-xl object-contain"
              onError={onLogoError}
            />
            <div className="min-w-0">
              <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">{schoolName}</p>
              <p className="truncate text-[11px] text-muted-foreground">Student portal</p>
            </div>
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

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2 scrollbar-thin">
        {NAV.map((item) => <NavButton key={item.id} item={item} />)}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <NavButton item={SETTINGS} />
      </div>
    </aside>
  );
}
