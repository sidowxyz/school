import { useEffect, useRef, useState } from 'react';
import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Single source of truth for the small "stat card / section card / status badge"
 * primitives used across the Student Portal, Parent Portal, and Library Management
 * features. Fully unified to official shadcn/ui design tokens.
 */

export function StatCard({
  title, value, sub, icon: Icon, alert = false, positive = false, className = '',
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: Icon;
  iconColor?: string;
  iconBg?: string;
  /** Tints the card border/sub text red for attention-needed stats (overdue, fines, etc.). */
  alert?: boolean;
  /** Renders `sub` in green with an up-arrow, for trend callouts. */
  positive?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn(alert && 'border-destructive/40', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn('h-4 w-4 text-muted-foreground', alert && 'text-destructive')} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {sub && (
          <p className={cn('text-xs mt-1 text-muted-foreground', alert && 'text-destructive', positive && 'text-primary font-medium')}>
            {positive && '▲ '}{sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Alias kept so existing `TabStatCard` imports don't need call-site changes. */
export const TabStatCard = StatCard;

export function DashboardStatCard({
  title, value, change, positive, icon: Icon,
}: {
  title: string;
  value: string | number;
  change: string;
  positive: boolean;
  icon: Icon;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <span className={positive ? 'text-primary font-medium' : 'text-muted-foreground'}>▲ {change}</span>
          <span>from last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionCard({
  title, subtitle, action, children, className = '',
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('p-6 space-y-4', className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </Card>
  );
}

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
  Present: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
  Returned: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
  Paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
  Graded: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
  Submitted: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200/50',
  Absent: 'bg-destructive/10 text-destructive border-destructive/20',
  Overdue: 'bg-destructive/10 text-destructive border-destructive/20',
  Unpaid: 'bg-destructive/10 text-destructive border-destructive/20',
  Late: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50',
  Pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50',
  Due: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50',
  'Partially Paid': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50',
  Excused: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200/50',
  Weekend: 'bg-muted text-muted-foreground border-border',
  Holiday: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200/50',
  Promoted: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50',
  Retained: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50',
};

export function StatusBadge({ status }: { status: string }) {
  const customClass = STATUS_STYLES[status];
  if (customClass) {
    return <Badge variant="outline" className={cn('text-xs font-medium', customClass)}>{status}</Badge>;
  }
  return <Badge variant="secondary" className="text-xs font-medium">{status}</Badge>;
}

export function EmptyState({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground py-8 text-center">{text}</p>;
}

export function SearchBox({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full pl-8 text-xs"
      />
    </div>
  );
}

interface Option { value: string; label: string; sub?: string }

export function SearchableSelect({
  placeholder, options, value, onChange, disabled = false,
}: {
  placeholder: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = options.Funnel(
    (o) => !q || o.label.toLowerCase().includes(q) || (o.sub ?? '').toLowerCase().includes(q)
  );

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="w-full justify-between gap-2 text-xs font-medium"
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        <CaretDown size={14} className="text-muted-foreground shrink-0" />
      </Button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="h-8 w-full pl-7 pr-2 text-xs"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No matches found</p>
            ) : (
              filtered.map((o) => (
                <Button
                  variant="ghost"
                  size="sm"
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(''); }}
                  className={cn(
                    'w-full justify-start text-left px-2.5 py-1.5 text-xs rounded-md',
                    value === o.value && 'bg-primary/10 text-primary font-medium hover:bg-primary/15'
                  )}
                >
                  <div>
                    <p className="font-medium">{o.label}</p>
                    {o.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{o.sub}</p>}
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
