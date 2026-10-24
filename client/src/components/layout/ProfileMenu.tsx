import { useNavigate } from 'react-router-dom';
import { CaretDown, Desktop, Moon, SignOut, SquaresFour, Sun, UserCircle, type Icon } from '@phosphor-icons/react';
import { useAuth } from '../../hooks/useAuth';
import { homePathFor, roleLabel } from '../../hooks/usePermission';
import { authApi } from '../../features/auth/api/authApi';
import { useTheme, type Theme } from '../../context/ThemeContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Each built-in role keeps the colour it has on the Roles page.
const ROLE_TILE: Record<string, string> = {
  admin: 'bg-tile-pink', principal: 'bg-tile-violet', academic_officer: 'bg-tile-blue',
  teacher: 'bg-tile-green', accountant: 'bg-tile-yellow', student: 'bg-tile-blue', parent: 'bg-tile-pink',
};

const initials = (name?: string) =>
  (name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

const THEMES: { value: Theme; label: string; icon: Icon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Desktop },
];

function Avatar({ name, role, size = 'md' }: { name?: string; role?: string; size?: 'md' | 'lg' }) {
  return (
    <span className={cn(
      'flex shrink-0 items-center justify-center rounded-full font-semibold text-tile-foreground',
      ROLE_TILE[role ?? ''] ?? 'bg-tile-green',
      size === 'lg' ? 'h-12 w-12 text-base ring-4 ring-card' : 'h-9 w-9 text-xs',
    )}>
      {initials(name)}
    </span>
  );
}

/** The signed-in person in the top bar: who they are, their account, appearance and sign out. */
export default function ProfileMenu() {
  const { clearAuth, user, refreshToken } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const role = roleLabel(user) || 'Staff';
  const isPortal = user?.role === 'student' || user?.role === 'parent';

  const signOut = () => {
    authApi.logout(refreshToken).catch(() => {});
    clearAuth();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="plain" type="button" aria-label={`Account menu for ${user?.name ?? 'you'}`}
          className="group flex items-center gap-2.5 rounded-full border border-transparent p-1 pr-2.5 transition-colors hover:border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-border data-[state=open]:bg-muted/60">
          <Avatar name={user?.name} role={user?.role} />
          <span className="hidden min-w-0 text-left md:block">
            <span className="block max-w-[140px] truncate text-sm font-semibold leading-tight text-foreground">{user?.name ?? 'Signed in'}</span>
            <span className="block max-w-[140px] truncate text-[11px] leading-tight text-muted-foreground">{role}</span>
          </span>
          <CaretDown size={13} className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72 rounded-2xl border-border/70 p-1.5 shadow-xl">
        {/* Who is signed in */}
        <div className="mb-1 flex items-center gap-3 rounded-xl bg-gradient-to-br from-tile-green via-tile-blue to-tile-violet p-3 text-tile-foreground">
          <Avatar name={user?.name} role={user?.role} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.name ?? 'Signed in'}</p>
            <span className="mt-1 inline-flex rounded-full bg-card/70 px-2 py-0.5 text-[11px] font-medium">{role}</span>
          </div>
        </div>

        <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5" onSelect={() => navigate(user?.role === 'student' ? '/student-portal?tab=settings' : '/account')}>
          <UserCircle size={18} className="text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium">My account</p>
            <p className="text-xs text-muted-foreground">Name, password and sign-in</p>
          </div>
        </DropdownMenuItem>
        {!isPortal && (
          <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5" onSelect={() => navigate(homePathFor(user))}>
            <SquaresFour size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium">My dashboard</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="mx-1.5 my-1.5" />

        {/* Appearance: picked here without leaving the page; the menu stays open. */}
        <div className="px-3 pb-2 pt-1">
          <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Appearance</p>
          <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {THEMES.map(({ value, label, icon: ThemeIcon }) => (
              <Button key={value} variant="plain" type="button" role="radio" aria-checked={theme === value} onClick={() => setTheme(value)}
                className={cn('flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors',
                  theme === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <ThemeIcon size={14} /> {label}
              </Button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator className="mx-1.5 my-1.5" />

        <DropdownMenuItem className="gap-3 rounded-xl px-3 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={signOut}>
          <SignOut size={18} />
          <span className="text-sm font-medium">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
